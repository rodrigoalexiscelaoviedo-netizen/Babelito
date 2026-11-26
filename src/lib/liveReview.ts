/**
 * Después de una llamada en vivo: revisión frase por frase, notas estimadas y
 * guardado (sesión + errores) para que la llamada alimente "Mis errores", el
 * plan del día y el nivel.
 *
 * La revisión usa el coach de texto (claude-proxy). Todo sale de la
 * transcripción, así que no puede juzgar la pronunciación.
 */
import { askCoach } from "./claude";
import { tryParseAiJson } from "./json";
import { supabase } from "./supabaseClient";
import { ERROR_TYPES } from "./errorTypes";
import { MIN_USER_TURNS } from "./practice";
import type { ChatTurn } from "./types";

export interface LogEntry {
  who: "learner" | "coach";
  text: string;
}

export interface Mistake {
  /** Índice del turno (en la lista de turnos); null si no se pudo ubicar. */
  turn: number | null;
  said: string;
  better: string;
  type: string;
  why: string;
}

export interface Scores {
  grammar: number;
  vocabulary: number;
  fluency: number;
}

export interface CallReviewData {
  mistakes: Mistake[];
  /** null cuando se habló demasiado poco para puntuar. */
  scores: Scores | null;
  scoreNote: string;
  /** Datos nuevos sobre la persona para recordar en la próxima llamada. */
  facts: string[];
}

export interface ScoreRecord extends Scores {
  /** Fecha ISO de la llamada. */
  at: string;
}

/** Con menos palabras que esto, una nota no dice nada. */
export const MIN_WORDS_FOR_SCORES = 30;
export const MAX_MISTAKES = 8;
export const MAX_SCORE_HISTORY = 30;
export const MAX_MEMORY = 12;

// El proxy admite 4000 caracteres por mensaje.
const CHUNK_CHARS = 3800;
const MAX_CHUNKS = 4;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const errorTypeKey = (v: unknown): string => {
  const k = str(v, 40).toLowerCase();
  return Object.prototype.hasOwnProperty.call(ERROR_TYPES, k) ? k : "other";
};

export function toTurns(log: LogEntry[]): ChatTurn[] {
  return log
    .map((e): ChatTurn => ({ role: e.who === "learner" ? "user" : "assistant", content: e.text.replace(/\s+/g, " ").trim() }))
    .filter((t) => t.content);
}

export function learnerWords(turns: ChatTurn[]): number {
  return turns.filter((t) => t.role === "user").reduce((n, t) => n + t.content.split(/\s+/).length, 0);
}

/** Transcripción numerada, partida en mensajes que el proxy acepta (se conserva el final). */
export function transcriptChunks(turns: ChatTurn[]): string[] {
  const lines = turns.map((t, i) =>
    t.role === "user" ? `[${i}] LEARNER: ${t.content.slice(0, 600)}` : `coach: ${t.content.slice(0, 160)}`
  );
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current) chunks.push(current);
  return chunks.slice(-MAX_CHUNKS);
}

const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();

/** Turno del alumno donde realmente aparece la cita; null si no aparece en ninguno. */
function findTurn(turns: ChatTurn[], said: string, hint: number): number | null {
  const q = loose(said);
  if (!q) return null;
  const has = (i: number) => turns[i]?.role === "user" && ` ${loose(turns[i].content)} `.includes(` ${q} `);
  if (has(hint)) return hint;
  const i = turns.findIndex((_, k) => has(k));
  return i === -1 ? null : i;
}

/** Valida la respuesta de la IA. Descarta errores cuya cita la persona nunca dijo. */
export function parseReview(raw: string, turns: ChatTurn[]): CallReviewData | null {
  const data = tryParseAiJson<{ mistakes?: unknown; scores?: unknown; scoreNote?: unknown; facts?: unknown }>(raw);
  if (!data || !Array.isArray(data.mistakes)) return null;

  const seen = new Set<string>();
  const mistakes: Mistake[] = [];
  for (const item of data.mistakes as Array<Record<string, unknown>>) {
    const said = str(item?.said, 160);
    const better = str(item?.better, 200);
    if (!said || !better || loose(said) === loose(better)) continue;
    const turn = findTurn(turns, said, Number(item.line));
    const key = `${turn}|${loose(said)}`;
    if (turn === null || seen.has(key)) continue;
    seen.add(key);
    mistakes.push({ turn, said, better, type: errorTypeKey(item.type), why: str(item.why, 240) });
    if (mistakes.length === MAX_MISTAKES) break;
  }

  let scores: Scores | null = null;
  const s = data.scores as Record<string, unknown> | undefined;
  const values = [s?.grammar, s?.vocabulary, s?.fluency];
  if (learnerWords(turns) >= MIN_WORDS_FOR_SCORES && values.every((v) => typeof v === "number" && Number.isFinite(v))) {
    const [grammar, vocabulary, fluency] = (values as number[]).map((v) => Math.round(Math.min(100, Math.max(0, v))));
    scores = { grammar, vocabulary, fluency };
  }

  const facts = Array.isArray(data.facts) ? data.facts.map((f) => str(f, 140)).filter(Boolean).slice(0, 3) : [];

  return { mistakes: mistakes.sort((a, b) => a.turn! - b.turn!), scores, scoreNote: str(data.scoreNote, 240), facts };
}

export async function reviewCall(turns: ChatTurn[], level: string): Promise<CallReviewData | null> {
  const beginner = level === "A1" || level === "A2";
  const system = [
    `You review the transcript of a live English voice call with a Spanish speaker at CEFR level ${level}.`,
    "Only the numbered LEARNER lines are the learner's. The text comes from speech-to-text: ignore punctuation, capitals, hesitations, repeated words and anything that looks like a transcription error. Never judge pronunciation. Never invent mistakes.",
    `List the most useful mistakes (grammar, wrong word, unnatural phrase), at most ${MAX_MISTAKES}.`,
    '"said" must be an exact short quote from that line. "better" is the natural corrected version as a sentence the learner can say aloud.',
    `"type" is one of: ${Object.keys(ERROR_TYPES).join(", ")}.`,
    `"why" is one short sentence ${beginner ? "in Spanish" : "in simple English"}.`,
    "Scores are 0-100 relative to the demands of the CEFR level above: grammar (accuracy), vocabulary (range and precision), fluency (how developed and connected the answers are, judged from the text only).",
    '"facts": up to 3 short things the learner said about their own life that a friendly tutor could ask about next time (hobbies, work, plans, pets, tastes). Never include health, religion, politics, sexuality, money, legal matters, addresses, contact details or full names. Empty if there are none.',
    'Reply ONLY with JSON: {"mistakes":[{"line":0,"said":"","better":"","type":"","why":""}],"scores":{"grammar":0,"vocabulary":0,"fluency":0},"scoreNote":"one sentence on what would raise the scores","facts":[""]}',
  ].join(" ");
  const raw = await askCoach({
    system,
    messages: transcriptChunks(turns).map((content) => ({ role: "user", content })),
    json: true,
    maxTokens: 1024,
    temperature: 0.2,
  });
  return parseReview(raw, turns);
}

/** Errores sacados de las correcciones dadas durante la llamada (respaldo si la revisión falla). */
export function mistakesFromCorrections(
  corrections: Array<{ original: string; correction: string; explanation: string; type?: string }>
): Mistake[] {
  const seen = new Set<string>();
  const out: Mistake[] = [];
  for (const c of corrections) {
    const key = loose(c.original);
    if (!key || !c.correction || seen.has(key)) continue;
    seen.add(key);
    out.push({ turn: null, said: c.original, better: c.correction, type: errorTypeKey(c.type), why: c.explanation });
  }
  return out.slice(0, MAX_MISTAKES);
}

/**
 * Guarda la llamada. La sesión solo se registra si llega al mínimo de
 * intercambios (la misma regla que el chat); los errores se guardan siempre.
 */
export async function saveCall(input: {
  userId: string;
  topic: string;
  turns: ChatTurn[];
  mistakes: Mistake[];
  startedAt: number;
  endedAt: number;
}): Promise<{ ok: boolean }> {
  const { userId, topic, turns, mistakes } = input;
  const userTurns = turns.filter((t) => t.role === "user").length;
  let sessionId: string | null = null;
  let ok = true;

  if (userTurns >= MIN_USER_TURNS) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        session_type: "conversation",
        topic,
        messages: turns,
        ended_at: new Date(input.endedAt).toISOString(),
        duration_seconds: Math.max(0, Math.round((input.endedAt - input.startedAt) / 1000)),
        completed: true,
        turn_count: userTurns,
      })
      .select("id")
      .single();
    if (error) ok = false;
    sessionId = (data?.id as string | undefined) ?? null;
  }

  if (mistakes.length) {
    const rows = mistakes.map((m) => ({
      user_id: userId,
      session_id: sessionId,
      error_type: m.type,
      original_text: m.said,
      correction: m.better,
    }));
    let { error } = await supabase.from("errors").insert(rows.map((r, i) => ({ ...r, explanation: mistakes[i].why || null })));
    // El esquema real se armó en parte a mano: si la explicación no entra, se guarda el error sin ella.
    if (error) ({ error } = await supabase.from("errors").insert(rows));
    if (error) ok = false;
  }

  return { ok };
}

// ── Evolución de las notas (profiles.profile_json.liveScores) ────────────────────

export function readScoreHistory(profileJson: unknown): ScoreRecord[] {
  const list = (profileJson as { liveScores?: unknown } | null)?.liveScores;
  if (!Array.isArray(list)) return [];
  return (list as ScoreRecord[]).filter(
    (r) => r && typeof r.at === "string" && [r.grammar, r.vocabulary, r.fluency].every((v) => typeof v === "number")
  );
}

export async function loadScoreHistory(userId: string): Promise<ScoreRecord[]> {
  const { data } = await supabase.from("profiles").select("profile_json").eq("id", userId).maybeSingle();
  return readScoreHistory(data?.profile_json);
}

// ── Memoria entre llamadas (profiles.profile_json.liveMemory) ────────────────────

export function readMemory(profileJson: unknown): string[] {
  const list = (profileJson as { liveMemory?: unknown } | null)?.liveMemory;
  return Array.isArray(list) ? list.filter((f): f is string => typeof f === "string" && !!f.trim()).slice(-MAX_MEMORY) : [];
}

export function mergeMemory(old: string[], added: string[]): string[] {
  const out = [...old];
  for (const fact of added) {
    if (!out.some((f) => loose(f) === loose(fact))) out.push(fact);
  }
  return out.slice(-MAX_MEMORY);
}

/**
 * Guarda notas y recuerdos en una sola escritura. Relee el perfil para no pisar
 * otros datos. Devuelve las notas anteriores a esta llamada.
 */
export async function saveInsights(userId: string, insights: { score: ScoreRecord | null; facts: string[] }): Promise<ScoreRecord[]> {
  if (!insights.score && insights.facts.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("profile_json").eq("id", userId).maybeSingle();
  if (error || !data) return [];
  const profileJson = (data.profile_json ?? {}) as Record<string, unknown>;
  const previous = readScoreHistory(profileJson);
  await supabase
    .from("profiles")
    .update({
      profile_json: {
        ...profileJson,
        ...(insights.score ? { liveScores: [...previous, insights.score].slice(-MAX_SCORE_HISTORY) } : {}),
        ...(insights.facts.length ? { liveMemory: mergeMemory(readMemory(profileJson), insights.facts) } : {}),
      },
    })
    .eq("id", userId);
  return previous;
}

export async function loadMemory(userId: string): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("profile_json").eq("id", userId).maybeSingle();
  return readMemory(data?.profile_json);
}

export async function forgetMemory(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("profile_json").eq("id", userId).maybeSingle();
  if (error || !data) return false;
  const { liveMemory: _gone, ...rest } = (data.profile_json ?? {}) as Record<string, unknown>;
  const res = await supabase.from("profiles").update({ profile_json: rest }).eq("id", userId);
  return !res.error;
}
