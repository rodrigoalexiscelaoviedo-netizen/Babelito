import { askCoach } from "./claude";
import type { Level } from "./types";

// ── Reading sentences — cover sounds difficult for Spanish speakers ───────────

export interface ReadingSentence {
  id: number;
  text: string;
  targetSounds: string[];
}

export const READING_SENTENCES: ReadingSentence[] = [
  {
    id: 1,
    text: "The weather in the north is rather cold this time of year.",
    targetSounds: ["th_voiced", "th_voiceless"],
  },
  {
    id: 2,
    text: "I've lived in seven different villages and every view was very vivid.",
    targetSounds: ["v_vs_b"],
  },
  {
    id: 3,
    text: "The ship sailed past the sheep grazing on the beach.",
    targetSounds: ["ship_sheep"],
  },
  {
    id: 4,
    text: "We would really like to work with the whole world.",
    targetSounds: ["w_sound", "r_sound"],
  },
  {
    id: 5,
    text: "I think success requires three things: patience, practice, and persistence.",
    targetSounds: ["th_voiceless", "consonant_clusters"],
  },
];

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

// ── Open question generation ──────────────────────────────────────────────────

export async function generateOpenQuestion(interests?: string): Promise<string> {
  try {
    const context = interests?.trim()
      ? `The student is interested in: ${interests}.`
      : "The student is a general adult learner.";
    const raw = await askCoach({
      system: `You are an English tutor. Generate ONE short, natural conversational question for an adult language learner. The question should be easy to answer in 2-4 sentences. Reply with ONLY the question text — no introduction, no quotation marks, no extra text.`,
      messages: [{ role: "user", content: context }],
      maxTokens: 60,
      temperature: 0.8,
    });
    return raw.trim().replace(/^["']|["']$/g, "");
  } catch {
    return "Tell me about something you enjoy doing in your free time.";
  }
}

// ── Evaluate reading transcripts ─────────────────────────────────────────────

export interface ReadingEvalResult {
  level: Level;
  errors: Array<{ sound: string; word: string }>;
}

export async function evaluateReading(
  sentences: ReadingSentence[],
  transcripts: string[]
): Promise<ReadingEvalResult> {
  const pairs = sentences
    .map((s, i) => `Target ${i + 1}: "${s.text}"\nStudent said: "${transcripts[i] ?? ""}"`)
    .join("\n\n");

  try {
    const raw = await askCoach({
      system: `You are evaluating the English pronunciation of a Spanish-speaking student.
Compare each target sentence with what the student actually said.
Look for: th→d/t substitution, v→b confusion, short-i/long-i confusion (ship/sheep), missing consonant clusters, incorrect stress patterns.
Respond ONLY with a single valid JSON object, no markdown:
{"level":"B1","errors":[{"sound":"th_voiceless","word":"think"},{"sound":"v_vs_b","word":"vivid"}]}
Level must be one of: A1, A2, B1, B2, C1, C2.
errors: array of specific sound errors found (empty array if pronunciation was good).`,
      messages: [{ role: "user", content: pairs }],
      maxTokens: 400,
      temperature: 0.1,
    });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON");
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      level: string;
      errors: Array<{ sound: string; word: string }>;
    };
    const level = (CEFR_ORDER.includes(parsed.level as Level) ? parsed.level : "B1") as Level;
    return { level, errors: Array.isArray(parsed.errors) ? parsed.errors : [] };
  } catch {
    return { level: "B1", errors: [] };
  }
}

// ── Evaluate open spoken response ─────────────────────────────────────────────

export async function evaluateOpenResponse(
  question: string,
  transcript: string
): Promise<Level> {
  if (!transcript.trim()) return "A1";
  try {
    const raw = await askCoach({
      system: `You are evaluating the spoken English of a Spanish-speaking adult learner.
Assess: fluency (hesitations, filler words), grammatical accuracy, and vocabulary range.
Respond ONLY with a single valid JSON object, no markdown:
{"level":"B1","notes":"brief observation"}
Level must be one of: A1, A2, B1, B2, C1, C2.`,
      messages: [{
        role: "user",
        content: `Question asked: "${question}"\nStudent's spoken answer: "${transcript}"`,
      }],
      maxTokens: 120,
      temperature: 0.1,
    });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON");
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { level: string };
    return (CEFR_ORDER.includes(parsed.level as Level) ? parsed.level : "B1") as Level;
  } catch {
    return "B1";
  }
}
