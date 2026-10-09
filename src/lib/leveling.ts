/**
 * Re-leveling continuo. Recalcula profiles.current_level una vez por día
 * (consolidación) a partir de la evidencia reciente. Pesos aprobados:
 * Repaso (SRS) 60% · Conversación 30% · Diagnóstico 10%.
 *
 * Las funciones de scoring son puras (y tienen tests). El acceso a Supabase
 * está solo en consolidateLevel().
 */
import { supabase } from "./supabaseClient";
import { localDateISO } from "./dates";
import type { Level } from "./types";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

export const WEIGHTS = { review: 0.6, conversation: 0.3, diagnostic: 0.1 } as const;

/** Umbrales. Subir es más exigente que bajar: no queremos oscilar. */
export const THRESHOLDS = { up: 0.75, down: 0.35 } as const;

/** Sesiones mínimas en 7 días para tener evidencia suficiente para mover el nivel. */
export const MIN_SESSIONS_7D = 3;

const EASE_FLOOR = 1.3; // SM-2: ease mínimo
const EASE_BASELINE = 2.5; // ease inicial de un ítem nuevo

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function levelIndex(level: Level | null | undefined): number {
  return level ? LEVELS.indexOf(level) : -1;
}

/** Repaso: ease promedio de los ítems ya repasados. 2.5 → 1.0, 1.3 → 0.0. */
export function reviewScore(avgEase: number | null): number | null {
  if (avgEase === null) return null;
  return clamp01((avgEase - EASE_FLOOR) / (EASE_BASELINE - EASE_FLOOR));
}

/** Conversación: errores por sesión. 0 → 1.0, 6 o más → 0.0. */
export function conversationScore(errors: number, sessions: number): number | null {
  if (sessions === 0) return null;
  return clamp01(1 - errors / sessions / 6);
}

/**
 * Diagnóstico como ancla de estabilidad: 1 si el nivel actual ya es el
 * diagnosticado o superior, 0.5 si está un escalón debajo, 0 si está dos o más.
 */
export function diagnosticScore(current: Level, diagnosed: Level | null): number | null {
  if (!diagnosed) return null;
  const gap = levelIndex(diagnosed) - levelIndex(current);
  if (gap <= 0) return 1;
  if (gap === 1) return 0.5;
  return 0;
}

/** Promedio ponderado de los componentes disponibles (renormaliza los pesos). */
export function combinedScore(parts: { review: number | null; conversation: number | null; diagnostic: number | null }): number | null {
  let total = 0;
  let weight = 0;
  for (const key of ["review", "conversation", "diagnostic"] as const) {
    const v = parts[key];
    if (v === null) continue;
    total += v * WEIGHTS[key];
    weight += WEIGHTS[key];
  }
  return weight === 0 ? null : total / weight;
}

export interface LevelDecision {
  level: Level;
  changed: boolean;
  score: number | null;
  reason: string;
}

/**
 * Decide el nivel nuevo. Reglas:
 * - Sin evidencia suficiente (pocas sesiones o sin puntaje) → no se mueve.
 * - Se mueve como máximo UN escalón por consolidación.
 * - Nunca baja de diagnóstico−1 ni sube de diagnóstico+2 (evita saltos absurdos).
 */
export function decideLevel(input: {
  current: Level;
  diagnosed: Level | null;
  sessions7d: number;
  parts: { review: number | null; conversation: number | null; diagnostic: number | null };
}): LevelDecision {
  const { current, diagnosed, sessions7d, parts } = input;
  const score = combinedScore(parts);
  const stay = (reason: string): LevelDecision => ({ level: current, changed: false, score, reason });

  if (sessions7d < MIN_SESSIONS_7D) return stay("pocas sesiones recientes");
  if (score === null) return stay("sin evidencia");

  const idx = levelIndex(current);
  const floor = diagnosed ? Math.max(0, levelIndex(diagnosed) - 1) : 0;
  const cap = diagnosed ? Math.min(LEVELS.length - 1, levelIndex(diagnosed) + 2) : LEVELS.length - 1;

  if (score >= THRESHOLDS.up && idx < cap) {
    return { level: LEVELS[idx + 1], changed: true, score, reason: "sube: buen desempeño sostenido" };
  }
  if (score <= THRESHOLDS.down && idx > floor) {
    return { level: LEVELS[idx - 1], changed: true, score, reason: "baja: necesita reforzar la base" };
  }
  return stay("dentro del rango esperado");
}

/**
 * Consolidación diaria. Idempotente: si ya se consolidó hoy, no hace nada.
 * Devuelve si el nivel cambió para que la UI refresque el perfil.
 */
export async function consolidateLevel(profile: {
  id: string;
  current_level: Level | null;
  diagnosed_level: string | null;
  level_updated_on?: string | null;
}): Promise<{ changed: boolean; level: Level | null }> {
  const today = localDateISO();
  const current = (profile.current_level ?? "B1") as Level;
  if (profile.level_updated_on === today) return { changed: false, level: current };

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: sessions }, { data: errors }, { data: items }] = await Promise.all([
    supabase.from("sessions").select("id").eq("user_id", profile.id).gte("created_at", since),
    supabase.from("errors").select("id").eq("user_id", profile.id).gte("created_at", since),
    supabase.from("review_items").select("ease").eq("user_id", profile.id).gt("reps", 0).limit(300),
  ]);

  const eases = (items ?? []).map((r: { ease: number }) => r.ease);
  const avgEase = eases.length ? eases.reduce((a, b) => a + b, 0) / eases.length : null;
  const sessionCount = sessions?.length ?? 0;
  const errorCount = errors?.length ?? 0;
  const diagnosed = (profile.diagnosed_level as Level | null) ?? null;

  const decision = decideLevel({
    current,
    diagnosed,
    sessions7d: sessionCount,
    parts: {
      review: reviewScore(avgEase),
      conversation: conversationScore(errorCount, sessionCount),
      diagnostic: diagnosticScore(current, diagnosed),
    },
  });

  if (decision.changed) {
    await supabase.from("level_history").insert({
      user_id: profile.id,
      from_level: current,
      to_level: decision.level,
      score: decision.score,
      reason: decision.reason,
    });
  }

  await supabase
    .from("profiles")
    .update({
      current_level: decision.level,
      level_updated_on: today,
    })
    .eq("id", profile.id);

  return { changed: decision.changed, level: decision.level };
}
