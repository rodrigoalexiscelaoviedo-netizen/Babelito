/**
 * Puntaje real de pronunciación (Azure Speech vía la función `pronunciation-assess`).
 *
 * Flujo: se graba el audio en paralelo al reconocimiento del navegador, se
 * convierte a WAV PCM 16 kHz mono y se envía junto con la frase de referencia.
 * Si el servidor no tiene las claves de Azure (501), las funciones devuelven
 * null y la app sigue con la comparación por texto de siempre.
 */
import { supabase } from "./supabaseClient";

export interface WordScore {
  word: string;
  /** 0–100 */
  score: number;
  /** None, Mispronunciation, Omission o Insertion. */
  errorType: string;
}

export interface PronunciationScore {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  words: WordScore[];
}

const TARGET_RATE = 16000;
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-assess`;

// ── Puras (testeadas) ────────────────────────────────────────────────────────────

/** Codifica muestras float [-1,1] como WAV PCM 16-bit mono. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

interface AzureScores {
  AccuracyScore?: number;
  FluencyScore?: number;
  CompletenessScore?: number;
  PronScore?: number;
  ErrorType?: string;
}
interface AzureWord extends AzureScores {
  Word?: string;
  PronunciationAssessment?: AzureScores;
}
interface AzureNBest extends AzureScores {
  PronunciationAssessment?: AzureScores;
  Words?: AzureWord[];
}

/** Normaliza la respuesta de Azure (los puntajes pueden venir anidados o planos). */
export function parseAzureResult(data: unknown): PronunciationScore | null {
  const best = (data as { NBest?: AzureNBest[] } | null)?.NBest?.[0];
  if (!best) return null;
  const pa = best.PronunciationAssessment ?? best;
  const num = (v: number | undefined) => Math.round(typeof v === "number" ? v : 0);
  const words: WordScore[] = (best.Words ?? []).map((w) => {
    const wa = w.PronunciationAssessment ?? w;
    return { word: w.Word ?? "", score: num(wa.AccuracyScore), errorType: wa.ErrorType ?? "None" };
  });
  const accuracy = num(pa.AccuracyScore);
  return {
    overall: num(pa.PronScore ?? accuracy),
    accuracy,
    fluency: num(pa.FluencyScore),
    completeness: num(pa.CompletenessScore),
    words,
  };
}

/** Tono semántico de una palabra según su puntaje y tipo de error. */
export function wordTone(w: WordScore): "good" | "fair" | "poor" {
  if (w.errorType === "Omission" || w.errorType === "Mispronunciation") return w.score >= 80 ? "fair" : "poor";
  if (w.score >= 80) return "good";
  if (w.score >= 60) return "fair";
  return "poor";
}

// ── Captura y red ───────────────────────────────────────────────────────────────

export function audioCaptureSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export interface AudioCapture {
  /** Detiene la grabación y devuelve WAV 16 kHz mono (o null si no hubo audio). */
  stop: () => Promise<Uint8Array | null>;
  /** Cancela sin devolver audio y libera el micrófono. */
  cancel: () => void;
}

/** Empieza a grabar. Devuelve null si el micrófono no está disponible. */
export async function startAudioCapture(): Promise<AudioCapture | null> {
  if (!audioCaptureSupported()) return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return null;
  }
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    cancel: () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } finally {
        release();
      }
    },
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === "inactive") {
          release();
          resolve(null);
          return;
        }
        recorder.onstop = async () => {
          release();
          try {
            resolve(await blobToWav(new Blob(chunks, { type: recorder.mimeType })));
          } catch {
            resolve(null);
          }
        };
        recorder.stop();
      }),
  };
}

async function blobToWav(blob: Blob): Promise<Uint8Array | null> {
  if (blob.size < 1000) return null;
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const length = Math.ceil(decoded.duration * TARGET_RATE);
    const offline = new OfflineAudioContext(1, length, TARGET_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), TARGET_RATE);
  } finally {
    void ctx.close();
  }
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Si el servidor no tiene Azure configurado no se vuelve a intentar en esta sesión.
let notConfigured = false;
let availability: Promise<boolean> | null = null;

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * ¿El servidor tiene Azure configurado? Una llamada barata (sin audio): responde
 * 501 si faltan las claves y 400 si están (por el cuerpo vacío). Se consulta una
 * sola vez por sesión; así no se graba audio extra cuando no va a usarse.
 */
export function assessAvailable(): Promise<boolean> {
  if (notConfigured) return Promise.resolve(false);
  availability ??= (async () => {
    try {
      const headers = await authHeaders();
      if (!headers) return false;
      const res = await fetch(FUNCTIONS_URL, { method: "POST", headers, body: "{}" });
      if (res.status === 501 || res.status === 404) {
        notConfigured = true;
        return false;
      }
      return res.status === 400;
    } catch {
      return false;
    }
  })();
  return availability;
}

/** Evalúa la pronunciación. Devuelve null si no está disponible o falla (se usa el método clásico). */
export async function assessPronunciation(wav: Uint8Array, reference: string, locale: string): Promise<PronunciationScore | null> {
  if (notConfigured) return null;
  try {
    const headers = await authHeaders();
    if (!headers) return null;
    const res = await fetch(FUNCTIONS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ reference, wav: toBase64(wav), locale }),
    });
    if (res.status === 501) {
      notConfigured = true;
      return null;
    }
    if (!res.ok) return null;
    return parseAzureResult(await res.json());
  } catch {
    return null;
  }
}
