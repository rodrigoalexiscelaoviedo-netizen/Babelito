/**
 * Escalera de nivel: qué te falta para pasar al siguiente nivel.
 *
 * Usa los MISMOS criterios que la consolidación diaria (leveling.ts): fuerza de
 * repaso, precisión en conversación y diagnóstico, con el umbral de subida. Así
 * lo que se muestra es lo que realmente decide el nivel, no una promesa aparte.
 * Se suman metas de apoyo (situaciones y gramática) que ayudan a lograrlo.
 */
import { supabase } from "./supabaseClient";
import {
  LEVELS,
  MIN_SESSIONS_7D,
  THRESHOLDS,
  combinedScore,
  conversationScore,
  diagnosticScore,
  levelIndex,
  reviewScore,
} from "./leveling";
import { loadProgress, isComplete, SITUATIONS } from "./situations";
import { loadGrammarScores } from "./grammarProgress";
import { QUIZ_PASS_PERCENT } from "./situations";
import type { Level } from "./types";

export interface LadderEvidence {
  sessions7d: number;
  errors7d: number;
  /** Ease promedio de los ítems de repaso ya practicados (null si no hay). */
  avgEase: number | null;
  diagnosed: Level | null;
  situationsDone: number;
  grammarPassed: number;
}

export interface LadderGoal {
  id: string;
  label: string;
  hint: string;
  /** 0–100 */
  percent: number;
  /** Texto corto del valor actual, p. ej. "2/3" o "64%". */
  value: string;
  met: boolean;
  /** Meta que influye en el cálculo del nivel (true) o de apoyo (false). */
  counts: boolean;
}

export interface Ladder {
  current: Level;
  next: Level | null;
  rungs: Array<{ level: Level; state: "done" | "current" | "todo" }>;
  /** Puntaje combinado 0–100 (null si aún no hay evidencia). */
  readiness: number | null;
  /** Umbral para subir, 0–100. */
  needed: number;
  goals: LadderGoal[];
  message: string;
}

const pct = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100);

export function buildLadder(current: Level, e: LadderEvidence): Ladder {
  const idx = Math.max(0, levelIndex(current));
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  const review = reviewScore(e.avgEase);
  const convo = conversationScore(e.errors7d, e.sessions7d);
  const diag = diagnosticScore(current, e.diagnosed);
  const combined = combinedScore({ review, conversation: convo, diagnostic: diag });
  const needed = Math.round(THRESHOLDS.up * 100);

  const rungs = LEVELS.map((level, i) => ({
    level,
    state: i < idx ? ("done" as const) : i === idx ? ("current" as const) : ("todo" as const),
  }));

  const goals: LadderGoal[] = [];
  if (next) {
    goals.push(
      {
        id: "sessions",
        label: `Practise ${MIN_SESSIONS_7D}+ times this week`,
        hint: "Your level only moves with recent evidence.",
        percent: pct(e.sessions7d / MIN_SESSIONS_7D),
        value: `${Math.min(e.sessions7d, MIN_SESSIONS_7D)}/${MIN_SESSIONS_7D}`,
        met: e.sessions7d >= MIN_SESSIONS_7D,
        counts: true,
      },
      {
        id: "review",
        label: "Strengthen your review",
        hint: "Review items regularly so words stay in memory.",
        percent: review === null ? 0 : pct(review / THRESHOLDS.up),
        value: review === null ? "no data yet" : `${pct(review)}%`,
        met: review !== null && review >= THRESHOLDS.up,
        counts: true,
      },
      {
        id: "conversation",
        label: "Make fewer slips when you talk",
        hint: "Fewer than about 1.5 mistakes per session.",
        percent: convo === null ? 0 : pct(convo / THRESHOLDS.up),
        value: convo === null ? "no data yet" : `${pct(convo)}%`,
        met: convo !== null && convo >= THRESHOLDS.up,
        counts: true,
      },
      {
        id: "situations",
        label: "Complete 2 situation missions",
        hint: "Real-life practice that builds confidence.",
        percent: pct(e.situationsDone / 2),
        value: `${Math.min(e.situationsDone, 2)}/2`,
        met: e.situationsDone >= 2,
        counts: false,
      },
      {
        id: "grammar",
        label: "Pass 2 grammar lessons",
        hint: "Fix the habits your coach keeps noticing.",
        percent: pct(e.grammarPassed / 2),
        value: `${Math.min(e.grammarPassed, 2)}/2`,
        met: e.grammarPassed >= 2,
        counts: false,
      }
    );
  }

  let message: string;
  if (!next) message = "You are at the top level. Keep your skills sharp with situations and conversation.";
  else if (combined === null) message = "Practise a few times and your progress toward the next level will appear here.";
  else if (combined * 100 >= needed && e.sessions7d >= MIN_SESSIONS_7D) message = `You are ready for ${next}. Your level is re-checked every day.`;
  else message = `Keep going — you need about ${needed}% overall to reach ${next}.`;

  return { current, next, rungs, readiness: combined === null ? null : pct(combined), needed, goals, message };
}

/** Reúne la evidencia (mismas consultas que la consolidación diaria + progreso de situaciones y gramática). */
export async function loadLadderEvidence(userId: string, diagnosed: string | null): Promise<LadderEvidence> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: sessions }, { data: errors }, { data: items }, progress, grammar] = await Promise.all([
    supabase.from("sessions").select("id").eq("user_id", userId).gte("created_at", since),
    supabase.from("errors").select("id").eq("user_id", userId).gte("created_at", since),
    supabase.from("review_items").select("ease").eq("user_id", userId).gt("reps", 0).limit(300),
    loadProgress(userId),
    loadGrammarScores(userId),
  ]);
  const eases = (items ?? []).map((r: { ease: number }) => r.ease);
  return {
    sessions7d: sessions?.length ?? 0,
    errors7d: errors?.length ?? 0,
    avgEase: eases.length ? eases.reduce((a, b) => a + b, 0) / eases.length : null,
    diagnosed: (LEVELS as string[]).includes(diagnosed ?? "") ? (diagnosed as Level) : null,
    situationsDone: SITUATIONS.filter((s) => isComplete(progress[s.id]?.steps)).length,
    grammarPassed: Object.values(grammar).filter((v) => v >= QUIZ_PASS_PERCENT).length,
  };
}
