/**
 * Reglas compartidas de "qué cuenta como práctica".
 *
 * Un único umbral para todos los módulos conversacionales: el botón de
 * terminar siempre está disponible, pero la sesión solo se registra para la
 * racha si el usuario habló al menos MIN_USER_TURNS veces. Antes había dos
 * umbrales distintos (botón habilitado con 1 intercambio, registro con 3), y
 * el desajuste hacía que sesiones cortas se cerraran sin contar y sin aviso.
 */
import type { ChatTurn } from "./types";

export const MIN_USER_TURNS = 3;

export function countUserTurns(turns: ChatTurn[]): number {
  return turns.filter((t) => t.role === "user").length;
}

/** Intercambios que faltan para que la sesión cuente (0 si ya cuenta). */
export function turnsRemaining(turns: ChatTurn[]): number {
  return Math.max(0, MIN_USER_TURNS - countUserTurns(turns));
}

export function sessionCounts(turns: ChatTurn[]): boolean {
  return countUserTurns(turns) >= MIN_USER_TURNS;
}
