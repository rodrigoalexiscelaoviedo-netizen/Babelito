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
  /** Returns the last interim (unfinished) transcript at any point in time. */
  getInterim: () => string;
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
 * Crea un reconocedor de voz continuo con auto-restart usando instancias frescas.
 *
 * - continuous=true: el navegador no corta durante pausas naturales.
 * - Auto-restart con instancia NUEVA: cuando Chrome cierra la sesión por silencio,
 *   creamos un NEW SpeechRecognition en lugar de llamar rec.start() en el mismo objeto.
 *   Esto garantiza que e.results siempre nace vacío → no se re-procesan resultados
 *   anteriores → sin duplicación.
 * - onResult: llamado por cada segmento isFinal. El caller acumula en su propio ref.
 * - onInterim: texto provisional mientras el usuario habla.
 * - onEnd: solo se dispara cuando el usuario llama stop() manualmente.
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

  let manualStop    = false;
  let endFired      = false;
  let lastInterim   = "";
  let lastFinalIndex = -1; // highest e.results index already emitted as final

  const rec: any = new SR();
  rec.lang           = opts.lang ?? "en-GB";
  rec.continuous     = true;
  rec.interimResults = true;

  const fireEnd = () => {
    if (!endFired) { endFired = true; opts.onEnd?.(); }
  };

  rec.onstart       = () => console.log("[createRecognizer] onstart");
  rec.onaudiostart  = () => console.log("[createRecognizer] onaudiostart — mic open");
  rec.onspeechstart = () => console.log("[createRecognizer] onspeechstart — voice detected");
  rec.onspeechend   = () => console.log("[createRecognizer] onspeechend");
  rec.onaudioend    = () => console.log("[createRecognizer] onaudioend");

  rec.onresult = (e: any) => {
    console.log(`[createRecognizer] onresult — resultIndex=${e.resultIndex} results.length=${e.results.length} lastFinalIndex=${lastFinalIndex}`);
    let interim = "";
    let final   = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      const isFin = e.results[i].isFinal;
      console.log(`  [${i}] ${isFin ? "FINAL" : "interim"}: "${transcript}" (skip=${isFin && i <= lastFinalIndex})`);
      if (isFin) {
        // Guard: skip any final we already emitted (happens when Chrome re-fires
        // old e.results entries after a same-instance rec.start() on mobile).
        if (i > lastFinalIndex) {
          lastFinalIndex = i;
          final += transcript;
        }
      } else {
        interim += transcript;
      }
    }
    if (interim) { lastInterim = interim; opts.onInterim?.(interim); }
    if (final)   { lastInterim = ""; console.log(`[createRecognizer] → calling onResult("${final}")`); opts.onResult(final); }
  };

  rec.onerror = (e: any) => {
    console.log(`[createRecognizer] onerror — error="${e.error}"`);
    if (e.error !== "no-speech" && e.error !== "audio-capture") {
      manualStop = true;
      fireEnd();
    }
  };

  rec.onend = () => {
    console.log(`[createRecognizer] onend — manualStop=${manualStop} lastFinalIndex=${lastFinalIndex}`);
    if (!manualStop) {
      // Same-instance restart: preserves mic permission granted by the original
      // user gesture. lastFinalIndex ensures we never re-emit already-processed
      // finals even though Chrome keeps them in e.results across restarts.
      console.log("[createRecognizer] → restarting same instance");
      try { rec.start(); console.log("[createRecognizer] → restart started"); }
      catch (e) { console.error("[createRecognizer] → restart start() threw:", e); }
    } else {
      fireEnd();
    }
  };

  return {
    start: () => {
      manualStop     = false;
      endFired       = false;
      lastInterim    = "";
      lastFinalIndex = -1; // fresh manual start: process all results from zero
      try { rec.start(); } catch { /* already running */ }
    },
    stop: () => {
      manualStop = true;
      try { rec.stop(); } catch { /* not running */ }
    },
    getInterim: () => lastInterim,
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
