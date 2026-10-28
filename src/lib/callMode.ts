/** Ajustes del modo llamada de voz (Conversación). */

/** Silencio, tras haber hablado, que se toma como "terminé mi turno". */
export const SILENCE_MS = 1800;

/** Pantallas táctiles: el micrófono necesita un toque del usuario para abrirse. */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}
