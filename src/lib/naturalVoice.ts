/**
 * Voz natural (Azure Neural TTS) para el inglés, con respaldo a la voz del navegador.
 *
 * - Se consulta una vez si el servidor la tiene configurada (501 = no).
 * - El audio se cachea en memoria por texto+voz (los textos de la app se repiten mucho).
 * - Si algo falla (cuota, red), speech.ts cae sola a la voz del navegador.
 * - La persona puede apagarla en Perfil (preferencia local).
 */
import { supabase } from "./supabaseClient";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-tts`;
const PREF_KEY = "babelito:natural-voice";
const CACHE_LIMIT = 80;

/** Voz neural según el acento elegido. */
export function neuralVoiceFor(lang: string, alt = false): string | null {
  // La voz "alt" (masculina) permite que los diálogos suenen como dos personas.
  if (alt) {
    if (lang.startsWith("en-US")) return "en-US-GuyNeural";
    if (lang.startsWith("en")) return "en-GB-RyanNeural";
  }
  if (lang.startsWith("en-US")) return "en-US-JennyNeural";
  if (lang.startsWith("en-AU")) return "en-AU-NatashaNeural";
  if (lang.startsWith("en-IN")) return "en-IN-NeerjaNeural";
  if (lang.startsWith("en")) return "en-GB-SoniaNeural";
  return null; // catalán y otros: voz del navegador
}

export function clampRate(rate: number): number {
  return Math.min(1.5, Math.max(0.5, rate));
}

// ── Preferencia y disponibilidad ─────────────────────────────────────────────────

export function naturalVoicePref(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setNaturalVoicePref(on: boolean): void {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {
    /* sin almacenamiento: queda como está en esta sesión */
  }
}

let available: boolean | null = null;
let probe: Promise<boolean> | null = null;

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY };
}

/** Consulta (una vez por sesión) si el servidor tiene Azure TTS. 501/404 = no; 400 = sí. */
export function warmNaturalVoice(): Promise<boolean> {
  if (available !== null) return Promise.resolve(available);
  probe ??= (async () => {
    try {
      const headers = await authHeaders();
      if (!headers) return false;
      const res = await fetch(FUNCTIONS_URL, { method: "POST", headers, body: "{}" });
      available = res.status === 400;
      return available;
    } catch {
      return false;
    }
  })();
  return probe;
}

/** ¿Conviene intentar la voz natural ahora? */
export function naturalVoiceReady(): boolean {
  return available === true && naturalVoicePref();
}

// ── Reproducción ─────────────────────────────────────────────────────────────────

const cache = new Map<string, string>();
let current: HTMLAudioElement | null = null;
let token = 0;

async function fetchAudioUrl(text: string, voice: string): Promise<string | null> {
  const key = `${voice}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const headers = await authHeaders();
  if (!headers) return null;
  const res = await fetch(FUNCTIONS_URL, { method: "POST", headers, body: JSON.stringify({ text, voice }) });
  if (!res.ok) {
    if (res.status === 501 || res.status === 404) available = false;
    return null;
  }
  const url = URL.createObjectURL(await res.blob());
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      URL.revokeObjectURL(cache.get(oldest)!);
      cache.delete(oldest);
    }
  }
  cache.set(key, url);
  return url;
}

/**
 * Reproduce con voz natural. `onFail` se llama (una sola vez) si no se pudo, para
 * que quien llama use la voz del navegador. `onEnd` al terminar de sonar.
 */
export function playNatural(
  text: string,
  opts: { lang: string; rate: number; alt?: boolean; onEnd?: () => void; onFail: () => void }
): void {
  const voice = neuralVoiceFor(opts.lang, opts.alt);
  if (!voice) {
    opts.onFail();
    return;
  }
  stopNatural();
  const mine = ++token;
  void (async () => {
    try {
      const url = await fetchAudioUrl(text, voice);
      if (mine !== token) return; // otra lectura la reemplazó
      if (!url) throw new Error("no audio");
      const audio = new Audio(url);
      audio.playbackRate = clampRate(opts.rate);
      audio.onended = () => {
        if (current === audio) current = null;
        if (mine === token) opts.onEnd?.();
      };
      audio.onerror = () => {
        if (mine === token) {
          current = null;
          opts.onFail();
        }
      };
      current = audio;
      await audio.play();
    } catch {
      if (mine === token) opts.onFail();
    }
  })();
}

export function stopNatural(): void {
  token++;
  if (current) {
    try {
      current.pause();
    } catch {
      /* ya detenido */
    }
    current = null;
  }
}

export function pauseNatural(): boolean {
  if (!current) return false;
  current.pause();
  return true;
}

export function resumeNatural(): boolean {
  if (!current) return false;
  void current.play();
  return true;
}
