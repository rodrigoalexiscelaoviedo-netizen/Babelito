/**
 * Un único punto para escribir el nivel del perfil del diagnóstico.
 *
 * Regla: todo lo que cambia el nivel deja registro en level_history, para que el
 * historial siempre coincida con el nivel actual. Un test de nivel es evidencia,
 * así que queda registrado aunque el resultado sea el mismo nivel.
 *
 * (El cálculo automático diario ya registra en leveling.ts.)
 */
import { supabase } from "./supabaseClient";
import type { Level } from "./types";

/** Texto del historial para un test de nivel. */
export function diagnosticReason(from: string | null, to: Level): string {
  if (!from || from === to) return `test de nivel: confirmó ${to}`;
  return `test de nivel: pasó de ${from} a ${to}`;
}

/** Guarda el resultado de un test de nivel en el perfil y en el historial. */
export async function applyDiagnosticLevel(userId: string, level: Level): Promise<void> {
  const { data } = await supabase.from("profiles").select("current_level").eq("id", userId).single();
  const from = ((data as { current_level: string | null } | null)?.current_level ?? null) as string | null;

  const { error } = await supabase
    .from("profiles")
    .update({ diagnosed_level: level, current_level: level, diagnostic_complete: true })
    .eq("id", userId);
  if (error) throw error;

  await supabase.from("level_history").insert({
    user_id: userId,
    from_level: from ?? level,
    to_level: level,
    score: null,
    reason: diagnosticReason(from, level),
  });
}
