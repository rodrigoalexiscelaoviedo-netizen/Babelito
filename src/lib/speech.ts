// Wrappers finos sobre la Web Speech API (nativa del navegador, gratis).
// STT = reconocimiento de voz; TTS = lectura en voz alta.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window))
  );
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
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

/** Lee un texto en voz alta con acento británico si está disponible. */
export function speak(text: string, lang = "en-GB") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  // Sacamos los markdown markers antes de leer.
  const clean = text.replace(/\*\*/g, "").replace(/→/g, "").replace(/<<ERRORS:[^>]*>>/gi, "");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  u.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const gb = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith("en"));
  if (gb) u.voice = gb;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
