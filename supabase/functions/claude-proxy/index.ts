import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Primary: highest free-tier quota (15 RPM / 1000 RPD).
// Fallback: larger model, same free tier, used only after primary exhausts retries.
const MODEL_PRIMARY  = "gemini-2.5-flash-lite";
const MODEL_FALLBACK = "gemini-2.5-flash";

// Delays between retries on the primary model (ms).
const RETRY_DELAYS = [600, 1200, 1800];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Call one Gemini model. Returns { ok, status, data } — never throws. */
async function callGemini(
  model: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: any }> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(28000),
      }
    );
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      data: { error: { message: isTimeout ? "timeout" : String(err) } },
    };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Missing auth token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

  try {
    const payload = await req.json();
    const { system, messages, max_tokens = 1024, temperature = 0.7 } = payload;

    if (!Array.isArray(messages)) return json({ error: "messages must be an array" }, 400);

    // Gemini uses "contents" with role "user"/"model" (not "assistant").
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody: any = {
      contents,
      generationConfig: { temperature, maxOutputTokens: max_tokens },
    };
    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }

    // ── Primary model with up to 3 retries on 429/503/504/502 ────────────────
    let lastResult = await callGemini(MODEL_PRIMARY, geminiBody);

    for (let attempt = 0; !lastResult.ok && attempt < RETRY_DELAYS.length; attempt++) {
      const { status } = lastResult;
      // Only retry on transient/overload codes — not on auth or bad-request errors.
      if (status !== 429 && status !== 503 && status !== 504 && status !== 502) break;
      await sleep(RETRY_DELAYS[attempt]);
      lastResult = await callGemini(MODEL_PRIMARY, geminiBody);
    }

    // ── Fallback model (one attempt, no extra retries) ────────────────────────
    if (!lastResult.ok) {
      const { status } = lastResult;
      if (status === 429 || status === 503 || status === 504 || status === 502) {
        lastResult = await callGemini(MODEL_FALLBACK, geminiBody);
      }
    }

    // ── Return result ─────────────────────────────────────────────────────────
    if (!lastResult.ok) {
      const { status, data } = lastResult;
      const retryable = status === 429 || status === 503 || status === 504 || status === 502;
      return json(
        {
          error: data?.error?.message ?? "El coach no está disponible. Intentá de nuevo.",
          retryable,
        },
        retryable ? 503 : status
      );
    }

    const text =
      lastResult.data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("") ?? "";

    return json({ text, usage: lastResult.data?.usageMetadata ?? null });
  } catch (err) {
    return json({ error: String(err), retryable: false }, 500);
  }
});
