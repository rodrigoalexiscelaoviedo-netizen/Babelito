/**
 * Test de nivel adaptativo (parte escrita, de escucha y visual). Lógica pura: sin React,
 * sin red, testeable. Ver docs/DISENO-test-nivel.md.
 *
 * Método: escalera. Empieza en B1; cada acierto sube un escalón y cada error (incluido
 * "No lo sé") lo baja. Termina cuando la estimación se estabiliza o al llegar al máximo.
 */
import type { Level } from "./types";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
export const START_LEVEL_IDX = 2; // B1
export const MIN_ITEMS = 10;
export const MAX_ITEMS = 14;
/** Valor de `chosen` cuando la persona marca "No lo sé". */
export const DONT_KNOW = -1;

export type PlacementFormat = "choice" | "fix" | "listen" | "visual";
export type PlacementSkill = "grammar" | "vocab" | "usage" | "listening" | "visual";

export interface PlacementItem {
  id: string;
  level: Level;
  skill: PlacementSkill;
  format: PlacementFormat;
  /** Enunciado visible. En "listen" es la instrucción; el audio va en `audio`. */
  prompt: string;
  /** Siempre 4 opciones. */
  options: string[];
  /** Índice de la opción correcta. */
  answer: number;
  /** Texto que se lee en voz alta (formato "listen"). */
  audio?: string;
  /** Emoji o escena que se muestra grande (formato "visual"). */
  visual?: string;
}

export interface PlacementStep {
  itemId: string;
  format: PlacementFormat;
  /** Índice de nivel del ítem que se mostró. */
  levelIdx: number;
  /** Opción elegida, o DONT_KNOW. */
  chosen: number;
  correct: boolean;
}

export interface PlacementState {
  /** Escalón actual de la escalera. */
  levelIdx: number;
  history: PlacementStep[];
  used: string[];
}

export function initialState(): PlacementState {
  return { levelIdx: START_LEVEL_IDX, history: [], used: [] };
}

const clampIdx = (i: number) => Math.min(LEVELS.length - 1, Math.max(0, i));

/** ¿Termina el test? Mínimo de ítems, y luego, si los últimos 4 quedaron en el mismo escalón. */
export function isDone(state: PlacementState): boolean {
  const n = state.history.length;
  if (n >= MAX_ITEMS) return true;
  if (n < MIN_ITEMS) return false;
  const last = state.history.slice(-4).map((h) => h.levelIdx);
  return last.every((l) => l === last[0]);
}

/**
 * Próximo ítem: del escalón actual, o de los vecinos si ya no quedan. Evita repetir
 * formato en las dos últimas preguntas para que el test no sea solo opción múltiple.
 */
export function nextItem(state: PlacementState, bank: PlacementItem[], rng: () => number = Math.random): PlacementItem | null {
  if (isDone(state)) return null;
  const recentFormats = state.history.slice(-2).map((h) => h.format);
  for (let d = 0; d < LEVELS.length; d++) {
    const candidates = d === 0 ? [state.levelIdx] : [state.levelIdx - d, state.levelIdx + d];
    for (const idx of candidates) {
      if (idx < 0 || idx >= LEVELS.length) continue;
      const pool = bank.filter((i) => i.level === LEVELS[idx] && !state.used.includes(i.id));
      if (pool.length === 0) continue;
      const preferred = pool.filter((i) => !recentFormats.includes(i.format));
      const list = preferred.length > 0 ? preferred : pool;
      return list[Math.floor(rng() * list.length)];
    }
  }
  return null;
}

export function recordAnswer(state: PlacementState, item: PlacementItem, chosen: number): PlacementState {
  const correct = chosen !== DONT_KNOW && chosen === item.answer;
  const shownIdx = LEVELS.indexOf(item.level);
  return {
    levelIdx: clampIdx(state.levelIdx + (correct ? 1 : -1)),
    history: [...state.history, { itemId: item.id, format: item.format, levelIdx: shownIdx, chosen, correct }],
    used: [...state.used, item.id],
  };
}

/** Nivel escrito: promedio de los escalones de las últimas 4 preguntas, redondeado hacia abajo. */
export function estimateWrittenLevel(state: PlacementState): Level {
  const last = state.history.slice(-4);
  if (last.length === 0) return LEVELS[START_LEVEL_IDX];
  const mean = last.reduce((s, h) => s + h.levelIdx, 0) / last.length;
  return LEVELS[clampIdx(Math.floor(mean))];
}

/**
 * Combina el nivel escrito con el oral. El oral solo puede mover el resultado
 * un escalón (arriba o abajo). Sin evaluación oral, vale el escrito.
 */
export function combineWithOral(written: Level, oral: Level | null): Level {
  if (!oral) return written;
  const w = LEVELS.indexOf(written);
  const o = LEVELS.indexOf(oral);
  const adj = Math.max(-1, Math.min(1, o - w));
  return LEVELS[clampIdx(w + adj)];
}

/** Ordena el banco por nivel y devuelve cuántos ítems hay por escalón y formato. */
export function bankCoverage(bank: PlacementItem[]): Record<Level, Record<PlacementFormat, number>> {
  const out = {} as Record<Level, Record<PlacementFormat, number>>;
  for (const l of LEVELS) out[l] = { choice: 0, fix: 0, listen: 0, visual: 0 };
  for (const i of bank) out[i.level][i.format]++;
  return out;
}
