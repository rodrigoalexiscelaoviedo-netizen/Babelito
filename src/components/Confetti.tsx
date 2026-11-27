import { useMemo, type CSSProperties } from "react";
import { BRAND } from "../lib/theme";

/** Pseudoazar estable (mismo resultado en cada render): parece aleatorio, es puro. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Estallido de confeti desde el centro del contenedor (que debe ser `relative`).
 * Solo CSS: cada pieza recibe dirección, giro y demora por variables.
 * Con "menos movimiento" no se ve (ver .confetti-burst en index.css).
 */
export default function Confetti({ pieces = 28, spread = 170 }: { pieces?: number; spread?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const r = (k: number) => rand(i * 7 + k);
        // Reparto en abanico hacia arriba y a los lados, con algo de azar.
        const angle = (-160 + (140 * i) / Math.max(1, pieces - 1) + (r(1) * 16 - 8)) * (Math.PI / 180);
        const dist = spread * (0.55 + r(2) * 0.45);
        const fall = 40 + r(3) * 70; // la gravedad tira al final
        return {
          x: `${Math.cos(angle) * dist}px`,
          y: `${Math.sin(angle) * dist + fall}px`,
          r: `${(r(4) > 0.5 ? 1 : -1) * (240 + r(5) * 480)}deg`,
          delay: `${r(6) * 0.12}s`,
          dur: `${1.1 + r(0) * 0.6}s`,
          color: [BRAND.coral, BRAND.mint, BRAND.gold][i % 3],
          round: i % 4 === 0,
          w: 7 + (i % 3) * 3,
        };
      }),
    [pieces, spread]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden>
      {parts.map((p, i) => (
        <span
          key={i}
          className="confetti-burst"
          style={
            {
              "--x": p.x,
              "--y": p.y,
              "--r": p.r,
              "--delay": p.delay,
              "--dur": p.dur,
              width: p.w,
              height: p.round ? p.w : p.w * 0.45,
              borderRadius: p.round ? 9999 : 2,
              background: p.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Vibración corta en móviles que la soportan (Android). Silencioso si no hay. */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* sin vibración */
  }
}
