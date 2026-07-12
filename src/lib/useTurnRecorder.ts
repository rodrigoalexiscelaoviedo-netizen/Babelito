/**
 * Hook de captura de voz por turno — tolerante a pausas, sin duplicación.
 *
 * Diseñado para ShadowingBlock (Sounds, Stories, Reading, Listening):
 * el usuario graba una frase o varias, puede pausar entre palabras, y toca
 * "Done" cuando termina. La grabación NO se corta sola por silencio.
 *
 * Cómo evita la duplicación (ver createRecognizer en speech.ts):
 *  - continuous=true → Chrome no corta durante pausas naturales dentro de un turno.
 *  - Cuando Chrome sí cierra la sesión (silencio largo / mobile), createRecognizer
 *    reinicia con una instancia NUEVA (e.results siempre nace vacío).
 *  - Los isFinal ya confirmados viven en accRef de este hook, nunca en e.results
 *    de ninguna instancia de Chrome → imposible re-procesarlos.
 *  - onDone(text) se llama SOLO cuando el usuario toca Done (manualStop).
 *    Los reinicios automáticos son completamente transparentes.
 *
 * API idéntica a useSingleUtterance → ShadowingBlock solo cambia el import.
 */
import { useRef, useState } from "react";
import { createRecognizer, speechSupported, type Recognizer } from "./speech";

export interface TurnRecorderAPI {
  isRecording: boolean;
  interim: string;
  start: (onDone: (text: string, errorCode?: string) => void) => void;
  stop: () => void;
}

export function useTurnRecorder(lang: string): TurnRecorderAPI {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim]         = useState("");

  const recRef    = useRef<Recognizer | null>(null);
  const accRef    = useRef("");                                         // finals across all restarts
  const onDoneRef = useRef<((text: string, err?: string) => void) | null>(null);

  function start(onDone: (text: string, errorCode?: string) => void) {
    if (!speechSupported()) { onDone("", "not-supported"); return; }

    // Abort any in-flight recognizer from a previous call
    if (recRef.current) {
      onDoneRef.current = null;
      try { recRef.current.stop(); } catch { /* ignore */ }
      recRef.current = null;
    }

    console.log("[useTurnRecorder] start() — resetting accRef");
    accRef.current  = "";
    onDoneRef.current = onDone;
    setInterim("");
    setIsRecording(false);

    const rec: Recognizer | null = createRecognizer({
      lang,
      onInterim: setInterim,
      onResult: (t) => {
        const before = accRef.current;
        accRef.current = accRef.current ? `${accRef.current} ${t}` : t;
        console.log(`[useTurnRecorder] onResult — segment="${t}" | accBefore="${before}" | accAfter="${accRef.current}"`);
        setInterim("");
      },
      onEnd: () => {
        // Guard: a superseded recognizer (from a previous start() call) can
        // fire its onEnd asynchronously AFTER recRef.current was already
        // reassigned to a newer instance. If that happened, this onEnd is
        // stale — touching recRef/onDoneRef here would null out the live
        // recognizer and fire the callback prematurely. No-op instead.
        if (recRef.current !== rec) {
          console.log("[useTurnRecorder] onEnd from stale recognizer — ignoring");
          return;
        }
        // Fires only on manualStop (Done button or 30s safety timeout).
        console.log(`[useTurnRecorder] onEnd (manualStop) — final acc="${accRef.current}"`);
        setIsRecording(false);
        setInterim("");
        recRef.current = null;
        const cb = onDoneRef.current;
        onDoneRef.current = null;
        cb?.(accRef.current.trim());
      },
    });

    if (!rec) { onDone("", "not-supported"); return; }

    recRef.current = rec;
    rec.start();
    setIsRecording(true);
  }

  function stop() {
    // Triggers manualStop inside createRecognizer → onEnd fires → onDone called.
    recRef.current?.stop();
  }

  return { isRecording, interim, start, stop };
}
