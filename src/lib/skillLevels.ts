/**
 * Nivel por habilidad: lectura, escucha y conversación.
 *
 * Usa la misma regla que el nivel general (decideLevel): un puntaje 0–1 por
 * habilidad, con evidencia reciente (14 días), que mueve como máximo un escalón
 * desde el nivel general. Sin suficientes intentos, no se muestra un nivel.
 */
import { supabase } from "./supabaseClient";
import { decideLevel, levelIndex } from "./leveling";
import type { Level } from "./types";

export const SKILLS = ["reading", "listening", "conversation"] as const;
export type Skill = (typeof SKILLS)[number];

/** Intentos mínimos en 14 días para mostrar un nivel por habilidad. */
export const MIN_SKILL_ATTEMPTS = 5;
export const SKILL_WINDOW_DAYS = 14;

export interface SkillEstimate {
  skill: Skill;
  attempts: number;
  /** Aciertos 0–1, o null si no hay datos. */
  accuracy: number | null;
  /** Nivel estimado, o null si todavía no hay suficientes intentos. */
  level: Level | null;
  /** Escalón respecto del nivel general (−1, 0, +1). */
  step: number;
}

/** Aciertos agregados de una lista de intentos. */
export function accuracyOf(rows: Array<{ correct: number; total: number }>): number | null {
  const total = rows.reduce((a, r) => a + r.total, 0);
  if (total === 0) return null;
  return rows.reduce((a, r) => a + r.correct, 0) / total;
}

/**
 * Nivel estimado para una habilidad a partir de su puntaje y su cantidad de intentos.
 * Se mueve como máximo un escalón desde el nivel general, con las mismas
 * cotas que el nivel general (decideLevel).
 */
export function estimateSkill(input: {
  skill: Skill;
  general: Level;
  diagnosed: Level | null;
  attempts: number;
  accuracy: number | null;
}): SkillEstimate {
  const { skill, general, diagnosed, attempts, accuracy } = input;
  if (attempts < MIN_SKILL_ATTEMPTS || accuracy === null) {
    return { skill, attempts, accuracy, level: null, step: 0 };
  }
  const decision = decideLevel({
    current: general,
    diagnosed,
    sessions7d: attempts,
    parts: { review: accuracy, conversation: null, diagnostic: null },
  });
  const step = levelIndex(decision.level) - levelIndex(general);
  return { skill, attempts, accuracy, level: decision.level, step };
}

/** Guarda un intento de lectura o escucha. Si falla, no interrumpe la pantalla. */
export async function recordSkillAttempt(userId: string, skill: "reading" | "listening", correct: number, total: number): Promise<void> {
  if (total <= 0) return;
  const safeCorrect = Math.max(0, Math.min(correct, total));
  const { error } = await supabase.from("skill_attempts").insert({ user_id: userId, skill, correct: safeCorrect, total });
  if (error) console.warn("[skill_attempts]", error.message);
}

/** Intentos de lectura y escucha de los últimos 14 días. */
export async function loadSkillAttempts(userId: string): Promise<Array<{ skill: "reading" | "listening"; correct: number; total: number }>> {
  const since = new Date(Date.now() - SKILL_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("skill_attempts")
    .select("skill, correct, total")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error || !data) return [];
  return data as Array<{ skill: "reading" | "listening"; correct: number; total: number }>;
}
