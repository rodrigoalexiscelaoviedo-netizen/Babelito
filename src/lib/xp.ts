/**
 * Experiencia (XP) y niveles. Cada actividad da XP según tres cosas:
 *  - cantidad: cuánto hiciste (turnos, preguntas, repasos),
 *  - calidad: cuántos errores cometiste por turno,
 *  - esfuerzo: cuánto tiempo estuviste (con tope, para no premiar dejar la app abierta).
 *
 * Las funciones son puras (testeadas). La escritura va en awardXp(), que es
 * idempotente: cada actividad tiene una clave única (ref_key) en xp_events.
 */
import { supabase } from "./supabaseClient";
import { localDateISO } from "./dates";

export type XpSource = "conversation" | "roleplay" | "story" | "review" | "daily_lesson" | "sound" | "listening";

// ── Niveles ─────────────────────────────────────────────────────────────────────

/** XP necesaria para pasar del nivel n al n+1: 100 en el 1, +25 por nivel. */
export function xpToNextLevel(level: number): number {
  return 100 + 25 * (level - 1);
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP acumulada al inicio de este nivel. */
  levelStartXp: number;
  /** XP dentro del nivel actual. */
  intoLevel: number;
  /** XP que falta para el siguiente nivel. */
  toNext: number;
  progress: number; // 0..1
}

const TITLES: Array<[number, string]> = [
  [1, "Curious"],
  [5, "Explorer"],
  [10, "Storyteller"],
  [20, "Conversationalist"],
  [35, "Fluent Mind"],
];

export function levelTitle(level: number): string {
  let title = TITLES[0][1];
  for (const [from, name] of TITLES) if (level >= from) title = name;
  return title;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let start = 0;
  while (totalXp >= start + xpToNextLevel(level)) {
    start += xpToNextLevel(level);
    level++;
  }
  const intoLevel = totalXp - start;
  const span = xpToNextLevel(level);
  return {
    level,
    title: levelTitle(level),
    levelStartXp: start,
    intoLevel,
    toNext: span - intoLevel,
    progress: intoLevel / span,
  };
}

// ── Puntaje por actividad ───────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Calidad 0.6..1.0: sin errores = 1.0; 3 o más errores por turno del alumno = 0.6.
 * Con cero turnos no hay evidencia: devuelve 1 para no castigar una sesión vacía.
 */
export function qualityFactor(errorCount: number, userTurns: number): number {
  if (userTurns <= 0) return 1;
  const perTurn = errorCount / userTurns;
  return clamp(1 - perTurn * 0.2, 0.6, 1);
}

/** Esfuerzo: 1 XP por minuto de práctica, con tope de 15 minutos. */
export function effortBonus(durationSeconds: number): number {
  return clamp(Math.round(durationSeconds / 60), 0, 15);
}

/** Conversación o roleplay: 5 por turno del alumno (tope 40) × calidad + esfuerzo. */
export function conversationXp(input: { userTurns: number; errors: number; durationSeconds: number }): number {
  const base = clamp(input.userTurns * 5, 0, 40);
  return Math.round(base * qualityFactor(input.errors, input.userTurns) + effortBonus(input.durationSeconds));
}

/** Historia: 30 por completarla + hasta 30 según el puntaje de comprensión (0–100). */
export function storyXp(scorePercent: number): number {
  return 30 + Math.round(clamp(scorePercent, 0, 100) * 0.3);
}

/** Repaso: 3 si lo recordaste, 1 si lo fallaste (igual cuenta el esfuerzo). */
export function reviewXp(quality: "good" | "again"): number {
  return quality === "good" ? 3 : 1;
}

/** Sonidos: 2 por cada par mínimo acertado (una vez por par y día). */
export const SOUND_PAIR_XP = 2;

/** Escucha: 10 por terminar una sesión + 2 por cada acierto. */
export function listeningXp(correct: number): number {
  return 10 + clamp(correct, 0, 40) * 2;
}

/** Práctica del día completa: bonus fijo, una vez por día. */
export const DAILY_LESSON_XP = 25;

// ── Escritura ───────────────────────────────────────────────────────────────────

export interface XpAward {
  source: XpSource;
  /** Clave única por actividad, p. ej. "conv:<sessionId>". Evita contar dos veces. */
  refKey: string;
  amount: number;
  meta?: Record<string, unknown>;
}

/** Registra XP. Si la clave ya existe, no hace nada (idempotente). */
export async function awardXp(userId: string, award: XpAward): Promise<void> {
  if (award.amount <= 0) return;
  const { error } = await supabase.from("xp_events").upsert(
    {
      user_id: userId,
      ref_key: award.refKey,
      source: award.source,
      amount: award.amount,
      meta: award.meta ?? {},
    },
    { onConflict: "user_id,ref_key", ignoreDuplicates: true }
  );
  if (error) console.warn("[xp] awardXp:", error.message);
}

export interface XpEvent {
  id: string;
  source: XpSource;
  amount: number;
  created_at: string;
  meta: Record<string, unknown>;
}

export async function getTotalXp(userId: string): Promise<number> {
  const { data } = await supabase.from("xp_events").select("amount").eq("user_id", userId).limit(10000);
  return (data ?? []).reduce((sum, r: { amount: number }) => sum + r.amount, 0);
}

export async function getXpToday(userId: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  return (data ?? []).reduce((sum, r: { amount: number }) => sum + r.amount, 0);
}

export async function getRecentXp(userId: string, limit = 12): Promise<XpEvent[]> {
  const { data } = await supabase
    .from("xp_events")
    .select("id, source, amount, created_at, meta")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as XpEvent[];
}

/** Clave de XP de la práctica del día: una por fecha local. */
export function dailyLessonRefKey(date: string = localDateISO()): string {
  return `lesson:${date}`;
}

export const SOURCE_LABEL: Record<XpSource, string> = {
  conversation: "Conversation",
  roleplay: "Roleplay",
  story: "Story",
  review: "Review",
  daily_lesson: "Daily practice",
  sound: "Sounds",
  listening: "Listening",
};

/**
 * XP de una conversación o roleplay ya terminada. Cuenta los errores desde la
 * base (no desde la pantalla), así el puntaje no depende del estado de la UI.
 */
export async function awardSessionXp(
  userId: string,
  sessionId: string,
  source: "conversation" | "roleplay",
  userTurns: number,
  durationSeconds: number
): Promise<number> {
  const { count } = await supabase
    .from("errors")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  const amount = conversationXp({ userTurns, errors: count ?? 0, durationSeconds });
  await awardXp(userId, { source, refKey: `${source}:${sessionId}`, amount, meta: { userTurns, errors: count ?? 0 } });
  return amount;
}
