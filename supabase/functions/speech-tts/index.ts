/**
 * speech-tts — voz natural (Azure Neural TTS) para el inglés de la app.
 *
 * El navegador manda el texto y la voz; la función devuelve audio MP3. La clave
 * de Azure nunca llega al cliente. Sin las claves responde 501 y la app sigue
 * con la voz del navegador.
 *
 * Secrets: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, ALLOWED_ORIGIN (opcional),
 *          SUPABASE_URL / SUPABASE_ANON_KEY (inyectados).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (n: string) => (Deno.env.get(n) ?? "").trim();
const ALLOWED_ORIGIN = env("ALLOWED_ORIGIN");

const MAX_CHARS = 400;
const VOICES = new Set([
  "en-GB-SoniaNeural",
  "en-GB-RyanNeural",
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-AU-NatashaNeural",
  "en-IN-NeerjaNeural",
]);

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
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  if (ALLOWED_ORIGIN && req.headers.get("origin") !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403, cors);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Missing auth token" }, 401, cors);
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401, cors);

  const key = env("AZURE_SPEECH_KEY");
  const region = env("AZURE_SPEECH_REGION");
  if (!key || !region) return json({ error: "not_configured" }, 501, cors);

  let payload: { text?: unknown; voice?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const voice = typeof payload.voice === "string" && VOICES.has(payload.voice) ? payload.voice : "en-GB-SoniaNeural";
  if (!text || text.length > MAX_CHARS) return json({ error: "Invalid text" }, 400, cors);

  const lang = voice.slice(0, 5);
  const ssml = `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;

  let res: Response;
  try {
    res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "babelito",
      },
      body: ssml,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return json({ error: "Azure unreachable" }, 502, cors);
  }
  if (!res.ok) {
    return json({ error: res.status === 401 || res.status === 403 ? "azure_auth" : res.status === 429 ? "quota" : "azure_error", status: res.status }, 502, cors);
  }

  return new Response(await res.arrayBuffer(), {
    status: 200,
    headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
});
