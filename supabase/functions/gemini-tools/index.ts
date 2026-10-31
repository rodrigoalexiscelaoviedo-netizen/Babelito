/**
 * gemini-tools — funciones de Gemini que usan audio, imágenes y voz en tiempo real.
 *
 * Modos (campo `mode` del cuerpo JSON):
 *  - "audio":  feedback de pronunciación o transcripción a partir de una grabación.
 *  - "vision": explica una foto (menú, cartel, etiqueta…) con vocabulario útil.
 *  - "live-token": credencial temporal (un solo uso) para la conversación en tiempo real.
 *
 * La clave de Gemini nunca llega al navegador. Cada llamada descuenta de la cuota
 * diaria del coach (mismo contador que claude-proxy).
 *
 * Secrets: GEMINI_API_KEY, COACH_DAILY_LIMIT, ALLOWED_ORIGIN (opcional),
 *          SUPABASE_URL / SUPABASE_ANON_KEY (inyectados).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (n: string) => (Deno.env.get(n) ?? "").trim();
const ALLOWED_ORIGIN = env("ALLOWED_ORIGIN");
const DAILY_LIMIT = Number(env("COACH_DAILY_LIMIT") || "300");

const MODEL = "gemini-2.5-flash";
const MODEL_FALLBACK = "gemini-2.5-flash-lite";
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

// Límites de entrada (base64): evitan payloads enormes.
const MAX_AUDIO_B64 = 2_400_000; // ≈ 1,8 MB de audio
const MAX_IMAGE_B64 = 4_000_000; // ≈ 3 MB de imagen
const AUDIO_TYPES = new Set(["audio/wav", "audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/aac"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function callGemini(model: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(28000),
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      /* cuerpo vacío */
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 504, data: {} };
  }
}

/** Llama al modelo principal y, si está saturado, al de respaldo. Devuelve el texto o null. */
async function generate(parts: unknown[], system: string): Promise<{ text: string | null; status: number }> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 900, responseMimeType: "application/json" },
  };
  let r = await callGemini(MODEL, body);
  if (!r.ok && [429, 500, 502, 503, 504].includes(r.status)) r = await callGemini(MODEL_FALLBACK, body);
  if (!r.ok) return { text: null, status: r.status };
  const text = r.data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  return { text: text || null, status: 200 };
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1"]);

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

  if (!env("GEMINI_API_KEY")) return json({ error: "not_configured" }, 501, cors);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }
  const mode = payload.mode;

  // Sondeo barato (sin gastar cuota): ¿están disponibles las funciones?
  if (payload.probe === true) return json({ ok: true, modes: ["audio", "vision", "live-token"] }, 200, cors);

  if (mode !== "audio" && mode !== "vision" && mode !== "live-token") return json({ error: "Invalid mode" }, 400, cors);

  // Validación de entrada ANTES de gastar cuota.
  const level = LEVELS.has(String(payload.level)) ? String(payload.level) : "A2";
  let parts: unknown[] = [];
  let system = "";

  if (mode === "audio") {
    const data = clean(payload.audio, MAX_AUDIO_B64 + 1);
    const mime = clean(payload.mimeType, 40).split(";")[0];
    if (!data || data.length > MAX_AUDIO_B64 || !AUDIO_TYPES.has(mime)) return json({ error: "Invalid audio" }, 400, cors);
    const task = payload.task === "transcribe" ? "transcribe" : "feedback";
    const reference = clean(payload.reference, 300);
    if (task === "feedback" && !reference) return json({ error: "Missing reference" }, 400, cors);
    system =
      task === "transcribe"
        ? `You transcribe short English speech by a Spanish-speaking learner (level ${level}). Write exactly the words you hear, even if they are mispronounced or grammatically wrong. Reply ONLY with JSON: {"transcript": "..."}. If you hear nothing intelligible, use an empty string.`
        : `You are a kind, precise English pronunciation coach for a Spanish-speaking learner (level ${level}). The learner tried to say: "${reference}". Listen to the audio. Reply ONLY with JSON: {"transcript":"what you actually heard","summary":"one encouraging sentence in simple English","tips":[{"word":"the word","problem":"what sounded different, in Spanish, one short sentence","fix":"how to move lips/tongue to fix it, in Spanish, one short sentence"}]}. Give at most 3 tips about the most important problems, none if it was good. Never invent problems you did not hear.`;
    parts = [{ inlineData: { mimeType: mime, data } }, { text: task === "transcribe" ? "Transcribe this." : "Give pronunciation feedback." }];
  } else if (mode === "vision") {
    const data = clean(payload.image, MAX_IMAGE_B64 + 1);
    const mime = clean(payload.mimeType, 40);
    if (!data || data.length > MAX_IMAGE_B64 || !IMAGE_TYPES.has(mime)) return json({ error: "Invalid image" }, 400, cors);
    system = `You help a Spanish-speaking learner of English (level ${level}) understand real-life text in a photo (menu, sign, label, ticket, document, product…). Reply ONLY with JSON: {"kind":"what the photo shows, 2-4 words","summary":"2 short sentences in simple English about what it says","summary_es":"the same in neutral Spanish","vocabulary":[{"en":"useful word or phrase from the photo","es":"neutral Spanish meaning"}],"phrases":[{"en":"a useful sentence the learner could say in this situation","es":"neutral Spanish translation"}]}. Max 8 vocabulary items and 3 phrases, suited to level ${level}. If the photo has no readable text, say so in "summary" and return empty arrays.`;
    parts = [{ inlineData: { mimeType: mime, data } }, { text: "Explain this photo for the learner." }];
  }

  // Cuota diaria compartida con el coach.
  const { data: allowed, error: quotaErr } = await supabase.rpc("consume_coach_call", { p_daily_limit: DAILY_LIMIT });
  if (quotaErr) return json({ error: "No pudimos verificar tu cuota.", retryable: true }, 503, cors);
  if (allowed !== true) return json({ error: "Has llegado al límite diario del coach. Vuelve mañana.", retryable: false, quota: true }, 429, cors);

  if (mode === "live-token") {
    const now = Date.now();
    const res = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 20 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
      }),
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!res || !res.ok) return json({ error: "live_unavailable", status: res?.status ?? 0 }, 502, cors);
    const data = await res.json().catch(() => null);
    const name = data?.name as string | undefined;
    if (!name) return json({ error: "live_unavailable" }, 502, cors);
    return json({ token: name, model: LIVE_MODEL, expiresInSeconds: 1200 }, 200, cors);
  }

  const out = await generate(parts, system);
  if (!out.text) {
    const retryable = [429, 500, 502, 503, 504].includes(out.status);
    return json({ error: "El coach no pudo procesarlo. Inténtalo de nuevo.", retryable }, retryable ? 503 : 502, cors);
  }
  try {
    return json({ result: JSON.parse(out.text) }, 200, cors);
  } catch {
    return json({ error: "Respuesta no válida del coach.", retryable: true }, 502, cors);
  }
});
