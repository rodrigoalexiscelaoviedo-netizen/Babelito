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
 * Crea un reconocedor de voz continuo con auto-restart.
 *
 * - continuous=true: el navegador no corta durante pausas naturales.
 * - Auto-restart en la MISMA instancia: cuando Chrome cierra la sesión por
 *   silencio, se llama rec.start() de nuevo sobre el mismo objeto (no uno
 *   nuevo) para preservar el permiso de mic ya otorgado. Chrome puede
 *   re-emitir en e.results entries que ya procesamos — lastFinalIndex evita
 *   reprocesarlas, y stripLeadingOverlap recorta la palabra final que a
 *   veces el motor repite al arrancar el siguiente segmento.
 * - onResult: llamado por cada segmento isFinal. El caller acumula en su propio ref.
 * - onInterim: texto provisional mientras el usuario habla.
 * - onEnd: solo se dispara cuando el usuario llama stop() manualmente.
 */
function normWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Chrome mobile a veces re-pronuncia la(s) última(s) palabra(s) de un
 * segmento final al principio del siguiente final (distinto índice, mismo
 * contenido) — no es re-procesamiento de un resultado ya visto (eso lo
 * cubre lastFinalIndex), es el motor de reconocimiento duplicando texto
 * en el límite entre dos finals. Se detecta comparando la cola del texto
 * ya emitido contra la cabeza del nuevo segmento y se recorta el solape.
 */
function stripLeadingOverlap(prevTail: string, next: string): string {
  const prevWords = prevTail.trim().split(/\s+/).filter(Boolean);
  const nextWords = next.trim().split(/\s+/).filter(Boolean);
  if (!prevWords.length || !nextWords.length) return next;
  const maxK = Math.min(5, prevWords.length, nextWords.length);
  for (let k = maxK; k >= 1; k--) {
    const prevEnd = prevWords.slice(-k).map(normWord);
    const nextStart = nextWords.slice(0, k).map(normWord);
    if (prevEnd.every((w, idx) => w.length > 0 && w === nextStart[idx])) {
      return nextWords.slice(k).join(" ");
    }
  }
  return next;
}

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
  let lastFinalTail  = ""; // most recent raw final segment, for overlap detection

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
          const trimmed = stripLeadingOverlap(lastFinalTail, transcript);
          if (trimmed !== transcript) {
            console.log(`[createRecognizer] → trimmed boundary overlap: "${transcript}" → "${trimmed}"`);
          }
          lastFinalTail = transcript;
          final += (final && trimmed ? " " : "") + trimmed;
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
      lastFinalTail  = "";
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
