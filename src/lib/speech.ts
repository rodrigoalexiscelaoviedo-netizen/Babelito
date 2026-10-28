// Wrappers finos sobre la Web Speech API (nativa del navegador, gratis).
//
// Este archivo cubre SOLO el lado TTS (lectura en voz alta) + la detección de
// soporte. El reconocimiento de voz (STT) vive exclusivamente en
// useSpeechCapture.ts — no crear SpeechRecognition en ningún otro lado.

import { naturalVoiceReady, pauseNatural, playNatural, resumeNatural, stopNatural } from "./naturalVoice";

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export interface SpeakOptions {
  voiceName?: string;
  rate?: number;
  lang?: string;
  /** Se llama al terminar (o cortarse) la lectura de ESTA frase; no si otra la reemplazó. */
  onEnd?: () => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Devuelve las voces disponibles en el dispositivo, opcionalmente filtradas
 * por prefijo de idioma (ej: "en-GB", "en-US", "en").
 */
export function getVoices(langPrefix?: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (!langPrefix) return voices;
  return voices.filter((v) => v.lang.startsWith(langPrefix));
}

/** Voz del navegador (respaldo y catalán). */
function browserSpeak(clean: string, lang: string, rate: number, voiceName: string | undefined, onEnd: (() => void) | undefined) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  u.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  let voice: SpeechSynthesisVoice | undefined;
  if (voiceName) {
    voice = voices.find((v) => v.name === voiceName);
  }
  if (!voice) {
    voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith("en"));
  }
  if (voice) u.voice = voice;

  if (onEnd) {
    const done = () => {
      if (currentUtterance === u) {
        currentUtterance = null;
        onEnd?.();
      }
    };
    u.onend = done;
    u.onerror = done;
  }
  currentUtterance = u;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/**
 * Lee un texto en voz alta. Acepta un string de lang (backward compatible)
 * o un objeto SpeakOptions con voiceName, rate y lang opcionales.
 *
 * En inglés usa la voz natural de Azure si el servidor la tiene y la persona no
 * la apagó; ante cualquier fallo (cuota, red) cae a la voz del navegador.
 */
export function speak(text: string, langOrOpts: string | SpeakOptions = "en-GB") {
  if (typeof window === "undefined") return;

  const clean = text
    .replace(/\*\*/g, "")
    .replace(/→/g, "")
    .replace(/<<ERRORS:[^>]*>>/gi, "");

  let lang = "en-GB";
  let rate = 0.95;
  let voiceName: string | undefined;
  let onEnd: (() => void) | undefined;

  if (typeof langOrOpts === "string") {
    lang = langOrOpts;
  } else {
    lang = langOrOpts.lang ?? "en-GB";
    rate = langOrOpts.rate ?? 0.95;
    voiceName = langOrOpts.voiceName;
    onEnd = langOrOpts.onEnd;
  }

  if (lang.startsWith("en") && naturalVoiceReady()) {
    // Se corta cualquier lectura del navegador pendiente y se intenta la natural.
    currentUtterance = null;
    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      /* ignorar */
    }
    playNatural(clean, { lang, rate, onEnd, onFail: () => browserSpeak(clean, lang, rate, voiceName, onEnd) });
    return;
  }

  stopNatural();
  browserSpeak(clean, lang, rate, voiceName, onEnd);
}

/** Corta la lectura en curso sin disparar su onEnd. */
export function stopSpeech() {
  currentUtterance = null;
  stopNatural();
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {
    /* ignorar */
  }
}

/** Pausa la narración en curso. En Chrome Android puede ser inestable. */
export function pauseSpeech() {
  if (pauseNatural()) return;
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
  } catch {
    /* inestable en algunos navegadores */
  }
}

/** Reanuda la narración pausada. En Chrome Android puede ser inestable. */
export function resumeSpeech() {
  if (resumeNatural()) return;
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  } catch {
    /* inestable en algunos navegadores */
  }
}
