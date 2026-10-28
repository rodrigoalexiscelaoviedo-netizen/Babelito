/**
 * pronunciation-assess — puntaje real de pronunciación con Azure Speech.
 *
 * El cliente manda el audio (WAV PCM 16 kHz mono, base64) y la frase de
 * referencia; la función llama a la API REST de Pronunciation Assessment y
 * devuelve el JSON de Azure. La clave de Azure nunca llega al navegador.
 *
 * Secrets: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (p. ej. "westeurope"),
 *          ALLOWED_ORIGIN (opcional), SUPABASE_URL / SUPABASE_ANON_KEY (inyectados).
 * Sin las claves de Azure responde 501 {error:"not_configured"} y la app
 * sigue usando la comparación por reconocimiento de voz del navegador.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (n: string) => (Deno.env.get(n) ?? "").trim();
const ALLOWED_ORIGIN = env("ALLOWED_ORIGIN");

// ~45 s de audio a 16 kHz/16 bit mono = 1,44 MB; el tope evita payloads abusivos.
const MAX_WAV_BYTES = 1_600_000;
const MAX_REFERENCE_CHARS = 300;
const LOCALES = new Set(["en-US", "en-GB", "en-AU", "en-IN"]);

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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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

  let payload: { reference?: unknown; wav?: unknown; locale?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }
  const reference = typeof payload.reference === "string" ? payload.reference.trim() : "";
  const locale = typeof payload.locale === "string" && LOCALES.has(payload.locale) ? payload.locale : "en-GB";
  if (!reference || reference.length > MAX_REFERENCE_CHARS) return json({ error: "Invalid reference text" }, 400, cors);
  if (typeof payload.wav !== "string" || payload.wav.length > MAX_WAV_BYTES * 1.4) return json({ error: "Invalid audio" }, 400, cors);

  let audio: Uint8Array;
  try {
    audio = base64ToBytes(payload.wav);
  } catch {
    return json({ error: "Invalid audio encoding" }, 400, cors);
  }
  if (audio.length < 2000 || audio.length > MAX_WAV_BYTES) return json({ error: "Invalid audio size" }, 400, cors);

  const config = { ReferenceText: reference, GradingSystem: "HundredMark", Granularity: "Word", Dimension: "Comprehensive", EnableMiscue: "True" };
  const assessmentHeader = btoa(JSON.stringify(config));

  let res: Response;
  try {
    res = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
          Accept: "application/json",
          "Pronunciation-Assessment": assessmentHeader,
        },
        body: audio,
        signal: AbortSignal.timeout(20000),
      }
    );
  } catch {
    return json({ error: "Azure unreachable" }, 502, cors);
  }

  if (!res.ok) {
    // 401/403 = clave o región incorrectas; no se reenvía el cuerpo de Azure al cliente.
    return json({ error: res.status === 401 || res.status === 403 ? "azure_auth" : "azure_error", status: res.status }, 502, cors);
  }
  const data = await res.json().catch(() => null);
  if (!data) return json({ error: "azure_error" }, 502, cors);
  return json(data, 200, cors);
});
