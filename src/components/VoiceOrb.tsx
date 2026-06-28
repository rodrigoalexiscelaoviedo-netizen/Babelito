import { useEffect, useRef } from "react";

/**
 * Elemento firma de Babelito: un orbe que reacciona al micrófono.
 * Cuando está "listening", anima barras según el volumen real del mic.
 * Si no hay permiso de audio, cae a una animación suave.
 */
export default function VoiceOrb({ listening }: { listening: boolean }) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!listening) {
      cancelAnimationFrame(rafRef.current!);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      barsRef.current.forEach((b) => b && (b.style.transform = "scaleY(0.25)"));
      return;
    }

    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    let data: Uint8Array<ArrayBuffer>;

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        loop();
      })
      .catch(() => fallbackLoop());

    function loop() {
      if (!analyser) return;
      analyser.getByteFrequencyData(data);
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const v = (data[i * 2] ?? 0) / 255;
        bar.style.transform = `scaleY(${Math.max(0.25, v * 1.6)})`;
      });
      rafRef.current = requestAnimationFrame(loop);
    }

    function fallbackLoop() {
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
    }

    return () => {
      cancelAnimationFrame(rafRef.current!);
      audioCtx?.close();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
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
