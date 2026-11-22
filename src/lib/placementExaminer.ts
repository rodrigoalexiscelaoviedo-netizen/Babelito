/**
 * Examinador de voz para la parte oral del test de nivel. Usa la misma sesión en vivo que
 * IA Live, pero con un prompt de examinador y una sola herramienta: submit_rating.
 */
import type { Level } from "./types";
import { LEVELS } from "./placement";

export type ExaminerLang = "en" | "ca";

export interface ExaminerRating {
  cefr: Level;
  range: number;
  accuracy: number;
  vocabulary: number;
  fluency: number;
  coherence: number;
  evidence: string;
}

export const SUBMIT_RATING_TOOL = {
  name: "submit_rating",
  description:
    "Call this ONCE, at the end of the interview, with your final CEFR estimate and the criterion scores. Do not say the result out loud.",
  parameters: {
    type: "OBJECT",
    properties: {
      cefr: { type: "STRING", enum: ["A1", "A2", "B1", "B2", "C1"], description: "Best CEFR estimate" },
      range: { type: "INTEGER", description: "Range of language, 1 to 5" },
      accuracy: { type: "INTEGER", description: "Grammatical accuracy, 1 to 5" },
      vocabulary: { type: "INTEGER", description: "Vocabulary, 1 to 5" },
      fluency: { type: "INTEGER", description: "Fluency, 1 to 5" },
      coherence: { type: "INTEGER", description: "Coherence and organisation, 1 to 5" },
      evidence: { type: "STRING", description: "One short exact quote from the learner that best supports the estimate" },
    },
    required: ["cefr"],
  },
};

const ENGLISH_EXAMINER = [
  "You are an English examiner running a short, friendly oral placement interview (about 5 minutes) with a Spanish-speaking adult.",
  "Speak English only, clearly and at a natural pace. Ask ONE question at a time, and keep your turns short.",
  "Cover about six questions, in this order where it fits: a routine question about everyday life, a past experience, future plans, an opinion, a comparison, and a hypothetical.",
  "Adapt as you go. If answers are short or hesitant, switch to simpler everyday questions. If answers are long and accurate, ask more abstract ones: opinions, hypotheticals, complex past or future.",
  "Never correct the learner, never give hints, and never mention levels or scores during the interview.",
  "If the learner says nothing useful twice in a row, stop and rate them at A1 with low scores.",
  "When you have enough evidence (usually after 5 to 7 answers) or after about 6 minutes, thank the learner in one short sentence and call the submit_rating tool exactly once.",
].join(" ");

const CATALAN_EXAMINER = [
  "Ets un examinador de català que fa una entrevista curta i amable de nivell (uns 5 minuts) amb una persona adulta que parla castellà.",
  "Parla només en català, clarament i a un ritme natural. Fes UNA pregunta cada vegada, amb torns curts.",
  "Cobreix unes sis preguntes, en aquest ordre quan encaixi: una pregunta de rutina, una experiència passada, plans de futur, una opinió, una comparació i una hipòtesi.",
  "Adapta-t'hi. Si les respostes són curtes o dubtoses, passa a preguntes més simples de la vida diària. Si són llargues i correctes, fes preguntes més abstractes.",
  "No corregeixis mai, no donis pistes i no mencionis nivells ni puntuacions durant l'entrevista.",
  "Si la persona no diu res útil dues vegades seguides, para i valora-la com a A1 amb puntuacions baixes.",
  "Quan tinguis prou evidència (normalment després de 5 a 7 respostes) o després d'uns 6 minuts, dona les gràcies en una frase i crida la eina submit_rating exactament una vegada.",
].join(" ");

export function examinerSystemPrompt(lang: ExaminerLang): string {
  return lang === "ca" ? CATALAN_EXAMINER : ENGLISH_EXAMINER;
}

/** Tiempo máximo del examen oral (segundos). */
export const EXAMINER_MAX_SECONDS = 6 * 60;

const score = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 1;
};

/** Normaliza la calificación que llega por la herramienta. Null si el nivel no es válido. */
export function normalizeExaminerRating(args: Record<string, unknown>): ExaminerRating | null {
  const cefr = typeof args.cefr === "string" ? args.cefr.trim().toUpperCase() : "";
  if (!(LEVELS as string[]).includes(cefr)) return null;
  const evidence = typeof args.evidence === "string" ? args.evidence.trim().slice(0, 200) : "";
  return {
    cefr: cefr as Level,
    range: score(args.range),
    accuracy: score(args.accuracy),
    vocabulary: score(args.vocabulary),
    fluency: score(args.fluency),
    coherence: score(args.coherence),
    evidence,
  };
}
