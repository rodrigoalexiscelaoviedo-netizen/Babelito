/**
 * Cliente de la función `gemini-tools`: feedback de voz con audio, fotos y
 * credencial para la conversación en tiempo real. Las respuestas se normalizan
 * (la IA puede equivocarse de forma) antes de llegar a la pantalla.
 */
import { supabase } from "./supabaseClient";
import { RetryableError } from "./claude";

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tools`;

export interface VoiceTip {
  word: string;
  problem: string;
  fix: string;
}

export interface VoiceFeedback {
  transcript: string;
  summary: string;
  tips: VoiceTip[];
}

export interface PhotoItem {
  en: string;
  es: string;
}

export interface PhotoResult {
  kind: string;
  summary: string;
  summaryEs: string;
  vocabulary: PhotoItem[];
  phrases: PhotoItem[];
}

// ── Normalización (pura, testeada) ───────────────────────────────────────────────

const str = (v: unknown, max = 400): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

function items(v: unknown, limit: number): PhotoItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ en: str((x as PhotoItem)?.en, 160), es: str((x as PhotoItem)?.es, 160) }))
    .filter((x) => x.en && x.es)
    .slice(0, limit);
}

export function normalizeVoiceFeedback(raw: unknown): VoiceFeedback | null {
  const r = raw as { transcript?: unknown; summary?: unknown; tips?: unknown } | null;
  if (!r || typeof r !== "object") return null;
  const tips: VoiceTip[] = Array.isArray(r.tips)
    ? r.tips
        .map((t) => ({ word: str((t as VoiceTip)?.word, 60), problem: str((t as VoiceTip)?.problem, 240), fix: str((t as VoiceTip)?.fix, 240) }))
        .filter((t) => t.word && (t.problem || t.fix))
        .slice(0, 3)
    : [];
  const out = { transcript: str(r.transcript, 400), summary: str(r.summary, 240), tips };
  return out.transcript || out.summary || out.tips.length ? out : null;
}

export function normalizePhoto(raw: unknown): PhotoResult | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const out: PhotoResult = {
    kind: str(r.kind, 60),
    summary: str(r.summary, 500),
    summaryEs: str(r.summary_es, 500),
    vocabulary: items(r.vocabulary, 8),
    phrases: items(r.phrases, 3),
  };
  return out.summary || out.vocabulary.length ? out : null;
}

// ── Red ─────────────────────────────────────────────────────────────────────────

let availability: Promise<boolean> | null = null;

async function headers(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY };
}

/** ¿Está desplegada y configurada la función? (sondeo barato, una vez por sesión). */
export function geminiToolsAvailable(): Promise<boolean> {
  availability ??= (async () => {
    try {
      const h = await headers();
      if (!h) return false;
      const res = await fetch(URL, { method: "POST", headers: h, body: JSON.stringify({ probe: true }) });
      return res.ok;
    } catch {
      return false;
    }
  })();
  return availability;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const h = await headers();
  if (!h) throw new Error("No hay sesión activa.");
  let res: Response;
  try {
    res = await fetch(URL, { method: "POST", headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(32000) });
  } catch {
    throw new RetryableError("No se pudo conectar con el coach.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.retryable) throw new RetryableError(data.error ?? "El coach está con mucha demanda.");
    throw new Error(data?.error ?? "No se pudo completar la acción.");
  }
  return data as T;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Feedback de pronunciación a partir de una grabación WAV (la misma que se envía a Azure). */
export async function voiceFeedback(wav: Uint8Array, reference: string, level: string): Promise<VoiceFeedback | null> {
  const { result } = await call<{ result: unknown }>({
    mode: "audio",
    task: "feedback",
    audio: bytesToBase64(wav),
    mimeType: "audio/wav",
    reference,
    level,
  });
  return normalizeVoiceFeedback(result);
}

/** Transcribe una grabación (útil en navegadores sin reconocimiento de voz). */
export async function transcribeAudio(wav: Uint8Array, level: string): Promise<string> {
  const { result } = await call<{ result: { transcript?: unknown } }>({
    mode: "audio",
    task: "transcribe",
    audio: bytesToBase64(wav),
    mimeType: "audio/wav",
    level,
  });
  return str(result?.transcript, 600);
}

/** Reduce la foto (lado largo ≤ 1024 px, JPEG) para enviarla rápido y barato. */
export async function photoToJpegBase64(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export async function explainPhoto(imageBase64: string, level: string): Promise<PhotoResult | null> {
  const { result } = await call<{ result: unknown }>({ mode: "vision", image: imageBase64, mimeType: "image/jpeg", level });
  return normalizePhoto(result);
}

/** Credencial temporal de un solo uso para la conversación en tiempo real. */
export async function getLiveToken(): Promise<{ token: string; model: string }> {
  return call<{ token: string; model: string }>({ mode: "live-token" });
}
