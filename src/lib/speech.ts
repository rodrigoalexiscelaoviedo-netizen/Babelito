// Wrappers finos sobre la Web Speech API (nativa del navegador, gratis).
// STT = reconocimiento de voz; TTS = lectura en voz alta.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
}

export interface SpeakOptions {
  voiceName?: string;
  rate?: number;
  lang?: string;
}

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

/**
 * Crea un reconocedor de voz. onResult recibe el texto final;
 * onInterim recibe el texto provisional mientras hablás.
 */
export function createRecognizer(opts: {
  lang?: string;
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  onEnd?: () => void;
}): Recognizer | null {
  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = opts.lang ?? "en-GB";
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (e: any) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += transcript;
      else interim += transcript;
    }
    if (interim && opts.onInterim) opts.onInterim(interim);
    if (final) opts.onResult(final);
  };
  rec.onend = () => opts.onEnd?.();

  return {
    start: () => {
      try {
        rec.start();
      } catch {
        /* ya iniciado */
      }
    },
    stop: () => rec.stop(),
  };
}

/**
 * Lee un texto en voz alta. Acepta un string de lang (backward compatible)
 * o un objeto SpeakOptions con voiceName, rate y lang opcionales.
 */
export function speak(text: string, langOrOpts: string | SpeakOptions = "en-GB") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const clean = text
    .replace(/\*\*/g, "")
    .replace(/→/g, "")
    .replace(/<<ERRORS:[^>]*>>/gi, "");

  let lang = "en-GB";
  let rate = 0.95;
  let voiceName: string | undefined;

  if (typeof langOrOpts === "string") {
    lang = langOrOpts;
  } else {
    lang = langOrOpts.lang ?? "en-GB";
    rate = langOrOpts.rate ?? 0.95;
    voiceName = langOrOpts.voiceName;
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

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Pausa la narración en curso. En Chrome Android puede ser inestable. */
export function pauseSpeech() {
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
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
  } catch {
    /* inestable en algunos navegadores */
  }
}
