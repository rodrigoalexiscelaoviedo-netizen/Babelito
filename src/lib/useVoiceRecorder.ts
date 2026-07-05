import { useRef, useState } from "react";
import { createRecognizer, speechSupported, type Recognizer } from "./speech";

export interface VoiceRecorderAPI {
  isRecording: boolean;
  interim: string;
  accumulated: string;
  start: () => void;
  /** Stops and returns all accumulated text (finals + latest interim as fallback). */
  stop: () => string;
}

/**
 * Modo B — Práctica oral.
 * Acumula resultados finales mientras el usuario habla. El componente llama
 * stop() manualmente (botón "Done") para cortar y obtener todo el texto.
 * Auto-restart transparente via createRecognizer (para Android/Chrome mobile).
 */
export function useVoiceRecorder(lang: string): VoiceRecorderAPI {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [accumulated, setAccumulated] = useState("");

  const recRef = useRef<Recognizer | null>(null);
  const accRef = useRef("");     // texto final confirmado
  const interimRef = useRef(""); // último texto provisional

  function start() {
    if (!speechSupported()) return;
    accRef.current = "";
    interimRef.current = "";
    setAccumulated("");
    setInterim("");

    const rec = createRecognizer({
      lang,
      onInterim: (t) => {
        interimRef.current = t;
        setInterim(t);
      },
      onResult: (t) => {
        accRef.current = accRef.current ? `${accRef.current} ${t}` : t;
        interimRef.current = "";
        setAccumulated(accRef.current);
        setInterim("");
      },
      onEnd: () => {
        setIsRecording(false);
        setInterim("");
      },
    });

    if (!rec) return;
    recRef.current = rec;
    rec.start();
    setIsRecording(true);
  }

  function stop(): string {
    // Si no hubo resultados finales aún, usamos el interim como fallback
    const text = (accRef.current || interimRef.current).trim();
    recRef.current?.stop();
    recRef.current = null;
    setIsRecording(false);
    setInterim("");
    return text;
  }

  return { isRecording, interim, accumulated, start, stop };
}
