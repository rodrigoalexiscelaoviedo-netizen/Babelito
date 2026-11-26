import { useEffect, useRef, type CSSProperties } from "react";
import { Loader2, MicOff } from "lucide-react";

export type TutorMode = "connecting" | "speaking" | "listening" | "thinking" | "muted";

const BAR_SHAPE = [0.45, 0.75, 1, 0.75, 0.45];

/**
 * El recuadro del coach, como la ventana de una videollamada. Se mueve con el
 * volumen real de su voz. El avatar, cuando lo haya, va aquí dentro: recibe el
 * mismo estado y el mismo volumen.
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

      <div className="relative mb-6 grid aspect-square h-[min(10rem,55%)] place-items-center" aria-hidden>
        <span
          className="absolute inset-0 rounded-full bg-[rgb(var(--accent)/0.14)]"
          style={{ transform: "scale(calc(0.82 + var(--voice) * 0.38))" }}
        />
        <span
          className={`absolute inset-3 rounded-full bg-[rgb(var(--accent)/0.2)] ${mode === "listening" ? "motion-safe:animate-live-breathe" : ""}`}
          style={mode === "speaking" ? { transform: "scale(calc(0.9 + var(--voice) * 0.22))" } : undefined}
        />
        <span className="relative grid h-[60%] w-[60%] place-items-center rounded-full bg-[rgb(var(--accent))] text-ink-900">
          {mode === "connecting" ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" size={30} />
          ) : mode === "muted" ? (
            <MicOff size={30} />
          ) : (
            <span className="flex h-10 items-center gap-1">
              {BAR_SHAPE.map((shape, i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-full bg-current ${mode === "thinking" ? "motion-safe:animate-pulse" : ""}`}
                  style={{
                    height: `calc(0.4rem + var(--voice) * ${shape * 2}rem)`,
                    animationDelay: mode === "thinking" ? `${i * 0.15}s` : undefined,
                  }}
                />
              ))}
            </span>
          )}
        </span>
      </div>

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
