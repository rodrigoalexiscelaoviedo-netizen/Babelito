import { useEffect, useRef, useState } from "react";

/**
 * Cuenta desde el valor anterior hasta `target` con frenado suave.
 * La primera vez arranca desde 0. Con "menos movimiento" salta directo.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function" || target === from.current) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out-quart
      setValue(Math.round(origin + (target - origin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, duration]);

  return value;
}
