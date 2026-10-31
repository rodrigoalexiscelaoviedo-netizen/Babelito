/**
 * Errores recurrentes: resumen por tipo (último mes vs mes anterior) y
 * ejercicios dirigidos generados por la IA (con la quiz de la lección como respaldo).
 */
import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";
import { tryParseAiJson } from "./json";
import { ERROR_TYPES } from "./errorTypes";
import { lessonsForError } from "./grammarLessons";
import { buildQuiz, shuffle } from "./situations";

export interface ErrorRow {
  error_type: string;
  original_text: string | null;
  correction: string | null;
  created_at: string;
}

export type Trend = "up" | "down" | "same" | "new";

export interface MistakeStat {
  type: string;
  count: number;
  previous: number;
  trend: Trend;
  /** Ejemplos recientes con corrección. */
  examples: ErrorRow[];
}

export interface MistakeSummary {
  /** Errores de gramática/vocabulario en los últimos 30 días. */
  total: number;
  stats: MistakeStat[];
  /** Palabras de pronunciación que fallaste este mes (sin repetir). */
  pronunciationWords: string[];
}

const DAY = 86_400_000;
const IGNORED = new Set(["other", "none", "pronunciation_error"]);

export function trendOf(count: number, previous: number): Trend {
  if (previous === 0 && count > 0) return "new";
  if (count < previous * 0.8) return "down";
  if (count > previous * 1.2) return "up";
  return "same";
}

/** Agrupa los errores por tipo comparando los últimos 30 días con los 30 anteriores. */
export function summarizeErrors(rows: ErrorRow[], now: number = Date.now()): MistakeSummary {
  const cutCurrent = now - 30 * DAY;
  const cutPrevious = now - 60 * DAY;

  const counts = new Map<string, { count: number; previous: number; examples: ErrorRow[] }>();
  const words: string[] = [];
  let total = 0;

  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const r of sorted) {
    const t = new Date(r.created_at).getTime();
    if (Number.isNaN(t) || t < cutPrevious) continue;
    const current = t >= cutCurrent;

    if (r.error_type === "pronunciation_error") {
      const w = (r.original_text ?? "").trim().toLowerCase();
      if (current && w && !words.includes(w)) words.push(w);
      continue;
    }
    if (IGNORED.has(r.error_type)) continue;

    const entry = counts.get(r.error_type) ?? { count: 0, previous: 0, examples: [] };
    if (current) {
      entry.count++;
      total++;
      if (r.original_text && r.correction && entry.examples.length < 3) entry.examples.push(r);
    } else {
      entry.previous++;
    }
    counts.set(r.error_type, entry);
  }

  const stats: MistakeStat[] = [...counts.entries()]
    .filter(([, v]) => v.count > 0)
    .map(([type, v]) => ({ type, count: v.count, previous: v.previous, trend: trendOf(v.count, v.previous), examples: v.examples }))
    .sort((a, b) => b.count - a.count);

  return { total, stats, pronunciationWords: words.slice(0, 8) };
}

export async function loadErrorRows(userId: string): Promise<ErrorRow[]> {
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const { data, error } = await supabase
    .from("errors")
    .select("error_type, original_text, correction, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(800);
  if (error || !data) return [];
  return data as ErrorRow[];
}

// ── Ejercicios dirigidos ────────────────────────────────────────────────────────

export interface ExerciseItem {
  q: string;
  options: string[];
  correctIndex: number;
  /** Explicación breve en español, si la hay. */
  explain?: string;
}

interface RawDrill {
  items?: Array<{ q?: unknown; options?: unknown; answer?: unknown; why?: unknown }>;
}

/** Valida y normaliza la respuesta de la IA; descarta lo que no sirva. */
export function parseDrill(raw: string, rng: () => number = Math.random): ExerciseItem[] {
  const data = tryParseAiJson<RawDrill>(raw);
  const out: ExerciseItem[] = [];
  for (const it of data?.items ?? []) {
    if (typeof it.q !== "string" || !it.q.includes("___")) continue;
    if (!Array.isArray(it.options) || it.options.length !== 3 || !it.options.every((o) => typeof o === "string" && o.trim())) continue;
    const answer = Number(it.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 2) continue;
    const options = it.options as string[];
    if (new Set(options.map((o) => o.trim().toLowerCase())).size !== 3) continue;
    const right = options[answer];
    const shuffled = shuffle(options, rng);
    out.push({
      q: it.q.trim(),
      options: shuffled,
      correctIndex: shuffled.indexOf(right),
      explain: typeof it.why === "string" ? it.why.trim() : undefined,
    });
  }
  return out.slice(0, 5);
}

/** 5 ejercicios de completar la frase sobre un tipo de error, a tu nivel. Respaldo: la quiz de la lección. */
export async function generateDrill(errorType: string, level: string): Promise<{ items: ExerciseItem[]; fromAi: boolean }> {
  const meta = ERROR_TYPES[errorType];
  try {
    const raw = await askCoach({
      json: true,
      system:
        `You write short grammar exercises for a Spanish speaker learning English at level ${level}. ` +
        `Focus: ${meta?.label ?? errorType} — ${meta?.hint ?? ""}. ` +
        `Reply with ONLY JSON: {"items":[{"q":"a short English sentence with ___ for the gap","options":["a","b","c"],"answer":0,"why":"one-sentence explanation in Spanish"}]}. ` +
        `Exactly 5 items, exactly 3 options each (one correct, two typical Spanish-speaker mistakes), "answer" is the index of the correct option. Use everyday situations. No markdown.`,
      messages: [{ role: "user", content: `Create the 5 exercises about: ${meta?.label ?? errorType}.` }],
      maxTokens: 900,
      temperature: 0.8,
    });
    const items = parseDrill(raw);
    if (items.length >= 3) return { items, fromAi: true };
  } catch {
    /* se usa el respaldo */
  }
  const lesson = lessonsForError(errorType)[0];
  return { items: lesson ? buildQuiz(lesson.quiz) : [], fromAi: false };
}
