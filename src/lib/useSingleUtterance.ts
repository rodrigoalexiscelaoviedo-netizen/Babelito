/**
 * Hook de captura de voz para frases cortas y puntuales (Diagnostic).
 *  - Instancia NUEVA de SpeechRecognition en cada start().
 *  - continuous: false — el navegador corta al silencio, sin auto-restart.
 *  - onend es el ÚNICO punto de salida; onerror solo guarda el código.
 *  - onDone(text, errorCode?) — text vacío + errorCode si falló la captura.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";

export interface SingleUtteranceAPI {
  isRecording: boolean;
  interim: string;
  start: (onDone: (text: string, errorCode?: string) => void) => void;
  stop: () => void;
}

export function useSingleUtterance(lang: string): SingleUtteranceAPI {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim]         = useState("");

  const recRef       = useRef<any>(null);
  const finalsRef    = useRef<string[]>([]);
  const onDoneRef    = useRef<((t: string, e?: string) => void) | null>(null);
  const lastErrorRef = useRef<string | undefined>(undefined);

  function start(onDone: (text: string, errorCode?: string) => void) {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { onDone("", "not-supported"); return; }

    // Destruir instancia anterior — anular su callback para evitar doble disparo
    if (recRef.current) {
      onDoneRef.current = null;
      try { recRef.current.abort(); } catch { /* ignorar */ }
      recRef.current = null;
    }

    finalsRef.current    = [];
    lastErrorRef.current = undefined;
    onDoneRef.current    = onDone;
    setInterim("");
    setIsRecording(false);

    const rec = new SR();
    rec.lang           = lang;
    rec.continuous     = false;
    rec.interimResults = true;
    recRef.current     = rec;

    // ── Lifecycle logs ────────────────────────────────────────────────────────
    rec.onstart      = () => console.log("[SpeechRec] onstart");
    rec.onaudiostart = () => console.log("[SpeechRec] onaudiostart");
    rec.onspeechstart = () => console.log("[SpeechRec] onspeechstart");

    rec.onresult = (e: any) => {
      console.log(
        `[SpeechRec] onresult — resultIndex=${e.resultIndex} results.length=${e.results.length}`
      );
      for (let i = 0; i < e.results.length; i++) {
        const t      = e.results[i][0].transcript as string;
        const isFin  = e.results[i].isFinal as boolean;
        const marker = i < e.resultIndex ? "SKIP(old)" : isFin ? "FINAL" : "interim";
        console.log(`  [${i}] ${marker}: "${t}"`);
      }

      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) {
          finalsRef.current.push(t);
          console.log("[SpeechRec] finals so far:", [...finalsRef.current]);
          setInterim("");
        } else {
          interimText += t;
        }
      }
      if (interimText) setInterim(interimText);
    };

    // onerror — solo guarda el código; onend es quien llama el callback
    rec.onerror = (e: any) => {
      console.log(`[SpeechRec] onerror: ${e.error}`);
      lastErrorRef.current = e.error as string;
      // onend se dispara siempre después de onerror — no llamar cb aquí
    };

    // onend — único punto de salida para todos los casos
    rec.onend = () => {
      const text      = finalsRef.current.join(" ").trim();
      const errorCode = lastErrorRef.current;
      console.log(
        `[SpeechRec] onend — finals=`, [...finalsRef.current],
        `→ result="${text}"`,
        errorCode ? `error=${errorCode}` : ""
      );
      setIsRecording(false);
      setInterim("");
      recRef.current = null;
      const cb = onDoneRef.current;
      onDoneRef.current = null;
      cb?.(text, errorCode);
    };

    try {
      rec.start();
      setIsRecording(true);
    } catch (err) {
      console.log("[SpeechRec] start() threw:", err);
      recRef.current    = null;
      onDoneRef.current = null;
      onDone("", "start-failed");
    }
  }

  function stop() {
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ya detenido */ }
      // onend se dispara solo y llama el callback
    }
  }

  return { isRecording, interim, start, stop };
}
