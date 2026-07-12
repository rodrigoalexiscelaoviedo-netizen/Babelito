import { useEffect, useRef } from "react";

/**
 * Elemento firma de Babelito: un orbe que reacciona al micrófono.
 *
 * NO abre su propio getUserMedia: en mobile Chrome, un stream de
 * getUserMedia corriendo en paralelo a SpeechRecognition hace que este
 * último pierda el mic silenciosamente (onstart dispara pero
 * onaudiostart nunca llega, y no transcribe nada). Como este orbe
 * siempre se muestra mientras un SpeechRecognition está activo, usa
 * una animación simulada en vez de un segundo stream de audio real.
 */
export default function VoiceOrb({ listening }: { listening: boolean }) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!listening) {
      cancelAnimationFrame(rafRef.current!);
      barsRef.current.forEach((b) => b && (b.style.transform = "scaleY(0.25)"));
      return;
    }

    let t = 0;
    const tick = () => {
      t += 0.15;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const v = 0.4 + 0.35 * Math.abs(Math.sin(t + i));
        bar.style.transform = `scaleY(${v})`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => cancelAnimationFrame(rafRef.current!);
  }, [listening]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          className={`w-1.5 rounded-full origin-center transition-colors duration-300 ${
            listening ? "bg-coral" : "bg-ink-500"
          }`}
          style={{ height: "100%", transform: "scaleY(0.25)" }}
        />
      ))}
    </div>
  );
}
