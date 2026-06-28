// Babelito — Edge Function: proxy a la API de Anthropic.
// La API key vive como secret de Supabase, nunca llega al navegador.
// Valida el JWT del usuario antes de gastar tokens, así el proxy
// no queda abierto al mundo.
//
// Deploy:
//   supabase functions deploy claude-proxy --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   (--no-verify-jwt porque validamos el token a mano abajo)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  // --- Validar que quien llama es un usuario logueado ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Missing auth token" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

  // --- Reenviar a Anthropic ---
  try {
    const payload = await req.json();
    const {
      system,
      messages,
      max_tokens = 1024,
      model = "claude-sonnet-4-6",
      temperature = 0.7,
    } = payload;

    if (!Array.isArray(messages)) return json({ error: "messages must be an array" }, 400);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens, temperature, system, messages }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) return json({ error: data?.error?.message ?? "Anthropic error" }, anthropicRes.status);

    // Devolvemos solo el texto plano para simplificar el front
    const text = Array.isArray(data.content)
      ? data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n")
      : "";

    return json({ text, usage: data.usage ?? null });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
