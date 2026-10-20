import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// Origen permitido (la app). Si no está definido, no se restringe (solo dev).
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const DAILY_LIMIT = Number(Deno.env.get("COACH_DAILY_LIMIT") ?? "300");

// Primary: highest free-tier quota (15 RPM / 1000 RPD).
// Fallback: larger model, same free tier, used only after primary exhausts retries.
const MODEL_PRIMARY = "gemini-2.5-flash-lite";
const MODEL_FALLBACK = "gemini-2.5-flash";

const RETRY_DELAYS = [600, 1200, 1800];

// Límites de entrada: evitan que un cliente manipulado gaste la cuota con payloads enormes.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_SYSTEM_CHARS = 12000;
const MAX_OUTPUT_TOKENS = 1024;

function corsFor(origin: string | null) {
  const allow = ALLOWED_ORIGIN ? (origin === ALLOWED_ORIGIN ? origin : "") : "*";
  return {
    "Access-Control-Allow-Origin": allow || ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(model: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
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
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
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

/** Valida y normaliza el payload. Devuelve un string de error o null. */
function validate(payload: any): string | null {
  if (!Array.isArray(payload?.messages)) return "messages must be an array";
  if (payload.messages.length === 0 || payload.messages.length > MAX_MESSAGES) {
    return `messages must have 1–${MAX_MESSAGES} items`;
  }
  for (const m of payload.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return "invalid message role";
    if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) {
      return `message content must be a string ≤ ${MAX_MESSAGE_CHARS} chars`;
    }
  }
  if (payload.system !== undefined && (typeof payload.system !== "string" || payload.system.length > MAX_SYSTEM_CHARS)) {
    return `system must be a string ≤ ${MAX_SYSTEM_CHARS} chars`;
  }
  return null;
}

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  if (ALLOWED_ORIGIN && req.headers.get("origin") !== ALLOWED_ORIGIN) {
    return json({ error: "Origin not allowed" }, 403, cors);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Missing auth token" }, 401, cors);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401, cors);

  // Cuota diaria por usuario (atómica, en Postgres).
  const { data: allowed, error: quotaErr } = await supabase.rpc("consume_coach_call", {
    p_daily_limit: DAILY_LIMIT,
  });
  if (quotaErr) return json({ error: "No pudimos verificar tu cuota.", retryable: true }, 503, cors);
  if (allowed !== true) {
    return json(
      { error: "Has llegado al límite diario del coach. Vuelve mañana.", retryable: false, quota: true },
      429,
      cors
    );
  }

  try {
    const payload = await req.json();
    const invalid = validate(payload);
    if (invalid) return json({ error: invalid }, 400, cors);

    const { system, messages } = payload;
    const maxTokens = Math.min(Math.max(Number(payload.max_tokens) || 1024, 1), MAX_OUTPUT_TOKENS);
    const temperature = Math.min(Math.max(Number(payload.temperature ?? 0.7), 0), 1);

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody: any = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (system) geminiBody.systemInstruction = { parts: [{ text: system }] };

    const transient = (s: number) => s === 429 || s === 503 || s === 504 || s === 502;

    let last = await callGemini(MODEL_PRIMARY, geminiBody);
    for (let attempt = 0; !last.ok && attempt < RETRY_DELAYS.length; attempt++) {
      if (!transient(last.status)) break;
      await sleep(RETRY_DELAYS[attempt]);
      last = await callGemini(MODEL_PRIMARY, geminiBody);
    }
    if (!last.ok && transient(last.status)) {
      last = await callGemini(MODEL_FALLBACK, geminiBody);
    }

    if (!last.ok) {
      const retryable = transient(last.status);
      return json(
        {
          error: last.data?.error?.message ?? "El coach no está disponible. Vuelve a intentarlo.",
          retryable,
        },
        retryable ? 503 : last.status,
        cors
      );
    }

    const text =
      last.data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

    return json({ text, usage: last.data?.usageMetadata ?? null }, 200, cors);
  } catch (err) {
    console.error("[claude-proxy]", err);
    return json({ error: "Error interno del coach.", retryable: false }, 500, cors);
  }
});
