/**
 * Lógica de Situaciones: progreso por misión, quiz y puente hacia Roleplay.
 * El contenido vive en situationsData.ts; el progreso, en la tabla
 * `situation_progress` (una fila por persona y situación).
 */
import { supabase } from "./supabaseClient";
import { awardXp } from "./xp";
import { levelRank } from "./storyLibrary";
import type { Scenario } from "./scenarios";
import { SITUATIONS, type QuizQuestion, type Situation } from "./situationsData";

export { SITUATIONS, getSituation } from "./situationsData";
export type { Situation, SituationLevel, Phrase, DialogueLine, QuizQuestion } from "./situationsData";

/** XP por completar una misión entera (una sola vez). */
export const SITUATION_XP = 50;
/** Puntaje mínimo (%) para aprobar el quiz. */
export const QUIZ_PASS_PERCENT = 60;

export interface SituationSteps {
  /** Frases y vocabulario guardados en el repaso. */
  phrases?: boolean;
  /** Diálogo estudiado. */
  dialogue?: boolean;
  /** Mejor puntaje del quiz, en %. */
  quiz?: number;
  /** Roleplay terminado y contado. */
  roleplay?: boolean;
}

export interface SituationProgress {
  pack_id: string;
  steps: SituationSteps;
  completed_at: string | null;
  updated_at: string;
}

export const STEP_ORDER = ["phrases", "dialogue", "quiz", "roleplay"] as const;
export type StepKey = (typeof STEP_ORDER)[number];

// ── Puras (testeadas) ────────────────────────────────────────────────────────────

export function stepDone(steps: SituationSteps | undefined, key: StepKey): boolean {
  if (!steps) return false;
  if (key === "quiz") return (steps.quiz ?? -1) >= QUIZ_PASS_PERCENT;
  return steps[key] === true;
}

/** Cuántos de los 4 pasos están hechos. */
export function stepsCount(steps: SituationSteps | undefined): number {
  return STEP_ORDER.filter((k) => stepDone(steps, k)).length;
}

export function isComplete(steps: SituationSteps | undefined): boolean {
  return stepsCount(steps) === STEP_ORDER.length;
}

/** Siguiente paso sin hacer, o null si está todo. */
export function nextStep(steps: SituationSteps | undefined): StepKey | null {
  return STEP_ORDER.find((k) => !stepDone(steps, k)) ?? null;
}

/** Mezcla (Fisher–Yates). `rng` inyectable para tests. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface QuizItem {
  q: string;
  options: string[];
  correctIndex: number;
}

/** Arma el quiz con las opciones mezcladas, recordando cuál es la correcta. */
export function buildQuiz(questions: QuizQuestion[], rng: () => number = Math.random): QuizItem[] {
  return shuffle(questions, rng).map((q) => {
    const options = shuffle([q.right, ...q.wrong], rng);
    return { q: q.q, options, correctIndex: options.indexOf(q.right) };
  });
}

export function quizPercent(correct: number, total: number): number {
  return total <= 0 ? 0 : Math.round((correct / total) * 100);
}

/** Situaciones ordenadas para la persona: su nivel primero, y las ya hechas al final. */
export function sortSituations(
  list: Situation[],
  userLevel: string | null | undefined,
  progress: Record<string, SituationProgress | undefined>
): Situation[] {
  const target = levelRank(userLevel ?? "A1");
  return [...list].sort((a, b) => {
    const doneA = isComplete(progress[a.id]?.steps) ? 1 : 0;
    const doneB = isComplete(progress[b.id]?.steps) ? 1 : 0;
    if (doneA !== doneB) return doneA - doneB;
    const dA = Math.abs(levelRank(a.level) - target);
    const dB = Math.abs(levelRank(b.level) - target);
    return dA - dB || levelRank(a.level) - levelRank(b.level);
  });
}

/** Escenario de Roleplay a partir de una situación (id numérico alto, sin chocar con los fijos). */
export function toScenario(pack: Situation): Scenario {
  const index = SITUATIONS.findIndex((s) => s.id === pack.id);
  return {
    id: 1000 + index,
    title: pack.title,
    description: pack.roleplay.description,
    coach_role: pack.roleplay.coachRole,
    opening: pack.roleplay.opening,
    difficulty: pack.level,
    icon: pack.icon,
  };
}

// ── Base de datos ───────────────────────────────────────────────────────────────

export async function loadProgress(userId: string): Promise<Record<string, SituationProgress>> {
  const { data, error } = await supabase
    .from("situation_progress")
    .select("pack_id, steps, completed_at, updated_at")
    .eq("user_id", userId);
  if (error || !data) return {};
  const out: Record<string, SituationProgress> = {};
  for (const row of data as SituationProgress[]) out[row.pack_id] = row;
  return out;
}

/**
 * Guarda un avance (mezclado con lo que ya había) y, si con eso se completan los
 * 4 pasos por primera vez, registra la fecha y entrega el XP (idempotente).
 */
export async function saveStep(
  userId: string,
  packId: string,
  patch: Partial<SituationSteps>
): Promise<{ steps: SituationSteps; justCompleted: boolean } | null> {
  const { data: existing } = await supabase
    .from("situation_progress")
    .select("steps, completed_at")
    .eq("user_id", userId)
    .eq("pack_id", packId)
    .maybeSingle();

  const prev = ((existing?.steps as SituationSteps | undefined) ?? {}) as SituationSteps;
  // El quiz conserva siempre el mejor puntaje.
  const merged: SituationSteps = { ...prev, ...patch };
  if (patch.quiz !== undefined) merged.quiz = Math.max(prev.quiz ?? 0, patch.quiz);

  const complete = isComplete(merged);
  const wasComplete = !!existing?.completed_at;
  const completed_at = wasComplete ? (existing?.completed_at as string) : complete ? new Date().toISOString() : null;

  const { error } = await supabase.from("situation_progress").upsert(
    { user_id: userId, pack_id: packId, steps: merged, completed_at, updated_at: new Date().toISOString() },
    { onConflict: "user_id,pack_id" }
  );
  if (error) return null;

  const justCompleted = complete && !wasComplete;
  if (justCompleted) {
    void awardXp(userId, { source: "situation", refKey: `situation:${packId}`, amount: SITUATION_XP, meta: { pack: packId } });
  }
  return { steps: merged, justCompleted };
}
