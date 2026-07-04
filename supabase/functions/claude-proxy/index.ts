import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MODEL = "gemini-2.0-flash";

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

    // Gemini usa "contents" con role "user"/"model" (no "assistant").
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
      },
    };

    // El system prompt va en un campo aparte en Gemini.
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return json({ error: data?.error?.message ?? "Gemini error" }, geminiRes.status);
    }

    // Extraer el texto de la respuesta de Gemini.
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("") ?? "";

    return json({ text, usage: data?.usageMetadata ?? null });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
