import { askCoach } from "./claude";
import type { Level } from "./types";
import { parseAiJson } from "./json";
import { diffWords } from "./dictation";

export type DiagLang = "en" | "ca";

// ── Reading sentences — cubren sonidos difíciles para hispanohablantes ─────────

export interface ReadingSentence {
  id: number;
  text: string;
  targetSounds: string[];
}

export const READING_SENTENCES: ReadingSentence[] = [
  { id: 1, text: "The weather in the north is rather cold this time of year.", targetSounds: ["th_voiced", "th_voiceless"] },
  { id: 2, text: "I've lived in seven different villages and every view was very vivid.", targetSounds: ["v_vs_b"] },
  { id: 3, text: "The ship sailed past the sheep grazing on the beach.", targetSounds: ["ship_sheep"] },
  { id: 4, text: "We would really like to work with the whole world.", targetSounds: ["w_sound", "r_sound"] },
  { id: 5, text: "I think success requires three things: patience, practice, and persistence.", targetSounds: ["th_voiceless", "consonant_clusters"] },
];

export const READING_SENTENCES_CA: ReadingSentence[] = [
  { id: 1, text: "La xerrada de demà al matí serà a la biblioteca.", targetSounds: ["x_sh"] },
  { id: 2, text: "Vaig veure una gran cassola plena de cargols i xocolata.", targetSounds: ["ll_palatal", "c_cedilla"] },
  { id: 3, text: "Quan arribo a casa, em rento les mans i menjo alguna cosa.", targetSounds: ["vowel_reduction"] },
  { id: 4, text: "La Núria vol aprendre a parlar bé el català abans de l'estiu.", targetSounds: ["r_trill", "vowel_reduction"] },
  { id: 5, text: "Ens trobem al pati del costat de la plaça de Sant Jaume.", targetSounds: ["ny_palatal", "tj_dj"] },
];

export function readingSentencesFor(lang: DiagLang): ReadingSentence[] {
  return lang === "ca" ? READING_SENTENCES_CA : READING_SENTENCES;
}

// ── CEFR helpers ─────────────────────────────────────────────────────────────

const CEFR_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/** Returns the lower of two CEFR levels. Handles "C2" as above C1. */
export function minCefr(a: string, b: string): Level {
  const order = [...CEFR_ORDER, "C2"];
  const iA = order.indexOf(a);
  const iB = order.indexOf(b);
  const safeA = iA < 0 ? 99 : iA;
  const safeB = iB < 0 ? 99 : iB;
  const idx = Math.min(safeA, safeB);
  return (order[idx] as Level) ?? "A1";
}

// ── Combinar escrito + hablado ────────────────────────────────────────────────

const LEVEL_IDX = (l: string): number => {
  const i = CEFR_ORDER.indexOf((l === "C2" ? "C1" : l) as Level);
  return i < 0 ? 0 : i;
};
const clampIdx = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Exactitud (0–1) con que se leyeron las frases: promedio de palabras acertadas. null si no hubo lectura. */
export function readingAccuracy(sentences: ReadingSentence[], transcripts: string[]): number | null {
  const scores: number[] = [];
  sentences.forEach((s, i) => {
    const said = (transcripts[i] ?? "").trim();
    if (said) scores.push(diffWords(s.text, said).accuracy / 100);
  });
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

export interface CombinedLevels {
  reading: Level;
  open: Level;
  oral: Level;
  final: Level;
}

/**
 * El nivel escrito es lo más fiable; lo hablado lo ajusta como máximo UN escalón
 * (hacia abajo si la lectura fue muy imprecisa, hacia arriba o abajo según la
 * conversación). Antes el resultado era el mínimo de las tres partes y una sola
 * lectura floja bajaba a cualquiera hasta A1.
 */
export function combineLevels(written: Level, readingAcc: number | null, openLevel: Level | string | null): CombinedLevels {
  const w = LEVEL_IDX(written);
  const readingAdj = readingAcc !== null && readingAcc < 0.5 ? -1 : 0;
  const openAdj = openLevel ? clampIdx(LEVEL_IDX(openLevel) - w, -1, 1) : 0;
  const adj = clampIdx(readingAdj + openAdj, -1, 1);
  const at = (i: number) => CEFR_ORDER[clampIdx(i, 0, CEFR_ORDER.length - 1)];
  const reading = at(w + readingAdj);
  const open = openLevel ? at(LEVEL_IDX(openLevel)) : written;
  return { reading, open, oral: at(Math.min(LEVEL_IDX(reading), LEVEL_IDX(open))), final: at(w + adj) };
}

// ── Open question generation ──────────────────────────────────────────────────

const OPEN_FALLBACK: Record<DiagLang, string> = {
  en: "Tell me about something you enjoy doing in your free time.",
  ca: "Explica'm alguna cosa que t'agradi fer al teu temps lliure.",
};

export async function generateOpenQuestion(interests: string | undefined, lang: DiagLang = "en"): Promise<string> {
  try {
    const context = interests?.trim()
      ? `The student is interested in: ${interests}.`
      : "The student is a general adult learner.";
    const system =
      lang === "ca"
        ? "Ets un tutor de català. Genera UNA pregunta curta i natural per a una conversa amb un adult que aprèn català. La pregunta ha de ser fàcil de respondre en 2-4 frases. Respon amb exactament UNA frase interrogativa en català, sense introducció ni cometes ni text extra."
        : "You are an English tutor. Generate ONE short, natural conversational question for an adult language learner. The question should be easy to answer in 2-4 sentences. Respond with exactly ONE complete question sentence. No introduction, no preamble, no quotation marks, no extra text — just the question.";
    const raw = await askCoach({
      system,
      messages: [{ role: "user", content: context }],
      maxTokens: 150,
      temperature: 0.8,
    });
    return raw.trim().replace(/^["']|["']$/g, "");
  } catch {
    return OPEN_FALLBACK[lang];
  }
}

// ── Evaluate reading transcripts ─────────────────────────────────────────────

export interface ReadingEvalResult {
  level: Level;
  errors: Array<{ sound: string; word: string }>;
}

const READING_SYSTEM: Record<DiagLang, string> = {
  en: `You are evaluating the English pronunciation of a Spanish-speaking student.
Compare each target sentence with what the student actually said.
Look for: th→d/t substitution, v→b confusion, short-i/long-i confusion (ship/sheep), missing consonant clusters, incorrect stress patterns.
Respond ONLY with a single valid JSON object, no markdown:
{"level":"B1","errors":[{"sound":"th_voiceless","word":"think"},{"sound":"v_vs_b","word":"vivid"}]}
Level must be one of: A1, A2, B1, B2, C1, C2.
errors: array of specific sound errors found (empty array if pronunciation was good).`,
  ca: `Ets un avaluador de pronunciació catalana per a un estudiant hispanohablant.
Compara cada frase objectiu amb el que l'estudiant ha dit realment (és una transcripció automàtica i pot tenir errors; no penalitzis puntuació ni majúscules).
Busca: x confosa amb s; ll i ny mal pronunciades; vocals àtones sense reducció; r vibrant vs simple; ç suau; tj/dj.
Respon NOMÉS amb un objecte JSON vàlid, sense markdown:
{"level":"B1","errors":[{"sound":"x_sh","word":"xerrada"},{"sound":"vowel_reduction","word":"demà"}]}
Level ha de ser un de: A1, A2, B1, B2, C1, C2.
errors: array d'errors de so concrets trobats (buit si la pronunciació és bona).`,
};

export async function evaluateReading(
  sentences: ReadingSentence[],
  transcripts: string[],
  lang: DiagLang = "en"
): Promise<ReadingEvalResult> {
  const pairs = sentences
    .map((s, i) => `Target ${i + 1}: "${s.text}"\nStudent said: "${transcripts[i] ?? ""}"`)
    .join("\n\n");

  try {
    const raw = await askCoach({
      json: true,
      system: READING_SYSTEM[lang],
      messages: [{ role: "user", content: pairs }],
      maxTokens: 400,
      temperature: 0.1,
    });
    const parsed = parseAiJson<{ level: string; errors: Array<{ sound: string; word: string }> }>(raw);
    const level = (CEFR_ORDER.includes(parsed.level as Level) ? parsed.level : "B1") as Level;
    return { level, errors: Array.isArray(parsed.errors) ? parsed.errors : [] };
  } catch {
    return { level: "B1", errors: [] };
  }
}

// ── Evaluate open spoken response ─────────────────────────────────────────────

const OPEN_SYSTEM: Record<DiagLang, string> = {
  en: `You are evaluating the spoken English of a Spanish-speaking adult learner.
Assess: fluency (hesitations, filler words), grammatical accuracy, and vocabulary range.
Respond ONLY with a single valid JSON object, no markdown:
{"level":"B1","notes":"brief observation"}
Level must be one of: A1, A2, B1, B2, C1, C2.`,
  ca: `Ets un avaluador del català parlat d'un adult hispanohablant que aprèn català.
Avalua: fluïdesa (vacil·lacions, muletilles), precisió gramatical i amplitud de vocabulari.
Respon NOMÉS amb un objecte JSON vàlid, sense markdown:
{"level":"B1","notes":"observació breu"}
Level ha de ser un de: A1, A2, B1, B2, C1, C2.`,
};

export async function evaluateOpenResponse(
  question: string,
  transcript: string,
  lang: DiagLang = "en"
): Promise<Level> {
  if (!transcript.trim()) return "A1";
  try {
    const raw = await askCoach({
      json: true,
      system: OPEN_SYSTEM[lang],
      messages: [{
        role: "user",
        content: `Question asked: "${question}"\nStudent's spoken answer: "${transcript}"`,
      }],
      maxTokens: 120,
      temperature: 0.1,
    });
    const parsed = parseAiJson<{ level: string }>(raw);
    return (CEFR_ORDER.includes(parsed.level as Level) ? parsed.level : "B1") as Level;
  } catch {
    return "B1";
  }
}
