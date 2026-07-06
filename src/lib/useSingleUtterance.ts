/**
 * Hook de captura de voz para frases cortas y puntuales (Diagnostic).
 * Diseño intencional:
 *  - Instancia NUEVA de SpeechRecognition en cada start() — nunca reutilizar.
 *  - continuous: false — el navegador detiene solo al silencio, sin auto-restart.
 *  - El resultado final llega via callback onDone(text) cuando el reconocedor cierra.
 *  - Al llamar start() se aborta la instancia anterior antes de crear la nueva.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";

export interface SingleUtteranceAPI {
  isRecording: boolean;
  /** Texto provisional mientras el usuario está hablando. */
  interim: string;
  /** Inicia una nueva captura. onDone se llama con el texto final al terminar. */
  start: (onDone: (text: string) => void) => void;
  /** Detiene manualmente (también activa onDone via onend nativo). */
  stop: () => void;
}

export function useSingleUtterance(lang: string): SingleUtteranceAPI {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");

  const recRef    = useRef<any>(null);
  const finalsRef = useRef<string[]>([]);
  const onDoneRef = useRef<((t: string) => void) | null>(null);

  function start(onDone: (text: string) => void) {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { onDone(""); return; }

    // Destruir instancia anterior sin llamar al callback viejo
    if (recRef.current) {
      onDoneRef.current = null;
      try { recRef.current.abort(); } catch { /* ignorar */ }
      recRef.current = null;
    }

    finalsRef.current = [];
    onDoneRef.current = onDone;
    setInterim("");
    setIsRecording(false); // reset limpio antes de rearmar

    const rec = new SR();
    rec.lang            = lang;
    rec.continuous      = false; // el navegador corta al silencio
    rec.interimResults  = true;
    recRef.current      = rec;

    rec.onresult = (e: any) => {
      // ── DIAGNÓSTICO ────────────────────────────────────────────────────────
      console.log(
        `[SpeechRec] onresult — resultIndex=${e.resultIndex} results.length=${e.results.length}`
      );
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        const final = e.results[i].isFinal;
        const marker = i < e.resultIndex ? "SKIP(old)" : final ? "FINAL" : "interim";
        console.log(`  [${i}] ${marker}: "${t}"`);
      }
      // ── fin diagnóstico ───────────────────────────────────────────────────

      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) {
          finalsRef.current.push(t);
          console.log(`[SpeechRec] finals so far:`, [...finalsRef.current]);
          setInterim("");
        } else {
          interimText += t;
        }
      }
      if (interimText) setInterim(interimText);
    };

    rec.onerror = (e: any) => {
      // no-speech es normal al silencio — onend se encarga
      if (e.error === "no-speech") return;
      // Error real (permisos, etc.): cerrar y devolver vacío
      setIsRecording(false);
      setInterim("");
      recRef.current = null;
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.("");
    };

    // onend siempre se dispara al cerrar (silence, stop(), abort(), error)
    rec.onend = () => {
      const text = finalsRef.current.join(" ").trim();
      console.log(`[SpeechRec] onend — finals=`, [...finalsRef.current], `→ result="${text}"`);
      setIsRecording(false);
      setInterim("");
      recRef.current = null;
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.(text);
    };

    try {
      rec.start();
      setIsRecording(true);
    } catch {
      recRef.current = null;
      onDoneRef.current = null;
      onDone("");
    }
  }

  function stop() {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ya detenido */ }
      // onend se dispara solo y llama al callback
    }
  }

  return { isRecording, interim, start, stop };
}
