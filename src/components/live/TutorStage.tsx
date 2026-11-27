import { useEffect, useRef, type CSSProperties } from "react";
import { Loader2, MicOff } from "lucide-react";
import TutorAvatar from "./TutorAvatar";

export type TutorMode = "connecting" | "speaking" | "listening" | "thinking" | "muted";

/**
 * El recuadro del coach, como la ventana de una videollamada. El avatar
 * (TutorAvatar) mueve la boca con el volumen real de su voz, que llega en la
 * variable CSS --voice sin volver a dibujar React.
 */
export default function TutorStage({
  mode,
  label,
  name,
  getLevel,
}: {
  mode: TutorMode;
  label: string;
  name: string;
  getLevel: () => number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const getLevelRef = useRef(getLevel);
  useEffect(() => {
    getLevelRef.current = getLevel;
  });

  // El volumen va a una variable CSS en cada cuadro, sin volver a dibujar React.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mode !== "speaking" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--voice", "0");
      return;
    }
    let frame = 0;
    let smooth = 0;
    const tick = () => {
      smooth = smooth * 0.65 + getLevelRef.current() * 0.35;
      el.style.setProperty("--voice", smooth.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  const accent = mode === "speaking" ? "var(--coral)" : mode === "muted" ? "var(--gold)" : "var(--mint)";

  return (
    <div
      ref={ref}
      className="relative grid w-full flex-1 place-items-center overflow-hidden rounded-3xl border border-ink-600 bg-ink-800 transition-colors duration-500"
      style={{ ["--accent" as string]: accent, ["--voice" as string]: "0", minHeight: "9rem" } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(70% 60% at 50% 45%, rgb(var(--accent) / 0.22), transparent 72%)",
          opacity: "calc(0.55 + var(--voice) * 0.45)",
        }}
      />

      {/* El coach, de los hombros para arriba, apoyado en el borde de abajo como en una videollamada. */}
      <div className="absolute inset-x-0 bottom-0 top-[12%] flex justify-center">
        <TutorAvatar mode={mode} />
      </div>

      {(mode === "connecting" || mode === "muted") && (
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--accent))] text-ink-900" aria-hidden>
          {mode === "connecting" ? <Loader2 className="animate-spin motion-reduce:animate-none" size={18} /> : <MicOff size={18} />}
        </span>
      )}

      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
        <span className="max-w-[60%] truncate rounded-full bg-ink-900/80 px-3 py-1 text-xs font-semibold">{name}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-ink-900/80 px-3 py-1 text-xs" role="status">
          <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent))]" aria-hidden />
          {label}
        </span>
      </div>
    </div>
  );
}
