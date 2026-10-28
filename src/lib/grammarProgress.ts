/**
 * Progreso de las lecciones de gramática. Reutiliza situation_progress con
 * pack_id "grammar:<id>" y steps.quiz = mejor puntaje (no hace falta tabla nueva).
 */
import { supabase } from "./supabaseClient";
import { QUIZ_PASS_PERCENT } from "./situations";

const PREFIX = "grammar:";

export async function loadGrammarScores(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("situation_progress")
    .select("pack_id, steps")
    .eq("user_id", userId)
    .like("pack_id", `${PREFIX}%`);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as Array<{ pack_id: string; steps: { quiz?: number } }>) {
    out[row.pack_id.slice(PREFIX.length)] = row.steps?.quiz ?? 0;
  }
  return out;
}

/** Guarda el mejor puntaje de la lección. Devuelve el mejor puntaje resultante. */
export async function saveGrammarScore(userId: string, lessonId: string, pct: number): Promise<number> {
  const packId = `${PREFIX}${lessonId}`;
  const { data: existing } = await supabase
    .from("situation_progress")
    .select("steps, completed_at")
    .eq("user_id", userId)
    .eq("pack_id", packId)
    .maybeSingle();
  const best = Math.max((existing?.steps as { quiz?: number } | undefined)?.quiz ?? 0, pct);
  const passed = best >= QUIZ_PASS_PERCENT;
  await supabase.from("situation_progress").upsert(
    {
      user_id: userId,
      pack_id: packId,
      steps: { quiz: best },
      completed_at: passed ? (existing?.completed_at as string | null) ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pack_id" }
  );
  return best;
}
