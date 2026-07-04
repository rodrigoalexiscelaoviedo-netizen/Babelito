import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";
import { createRecognizer, speechSupported } from "./speech";
import { getPhrasesByLevel, type PronunciationPhrase } from "./pronunciationPhrases";

export { getPhrasesByLevel };
export type { PronunciationPhrase };

export interface CompareResult {
  correct: string[];
  incorrect: string[];
  tokens: { word: string; ok: boolean }[];
}

export interface PronunciationFeedback {
  feedback: string;
  drillPhrase: string;
}

/** Wraps createRecognizer in a Promise — resolves with spoken text or null on timeout/error. */
export function recognizeSpeech(lang = "en-GB", timeoutMs = 8000): Promise<string | null> {
  if (!speechSupported()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        rec?.stop();
        resolve(null);
      }
    }, timeoutMs);

    const rec = createRecognizer({
      lang,
      onResult: (text) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(text.trim() || null);
        }
      },
      onEnd: () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
    });

    if (!rec) {
      clearTimeout(timer);
      resolve(null);
      return;
    }

    rec.start();
  });
}

/** Normalises a word for comparison: lowercase, strip punctuation. */
function normalise(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

/** Compares spoken text to target phrase word by word. */
export function comparePhrases(spoken: string, target: string): CompareResult {
  const targetWords = target.trim().split(/\s+/);
  const spokenWords = spoken.trim().split(/\s+/);

  const correct: string[] = [];
  const incorrect: string[] = [];
  const tokens: { word: string; ok: boolean }[] = [];

  targetWords.forEach((word, i) => {
    const norm = normalise(word);
    const spokenNorm = normalise(spokenWords[i] ?? "");
    const ok = norm === spokenNorm;
    tokens.push({ word, ok });
    if (ok) correct.push(word);
    else incorrect.push(word);
  });

  return { correct, incorrect, tokens };
}

const FEEDBACK_SYSTEM = `You are an English pronunciation coach.
The user tried to say a phrase and had difficulty.
Respond ONLY with a single valid JSON object — no markdown, no extra text:
{
  "feedback": "2-3 practical tips about the target sound, how to position tongue/lips/breath",
  "drillPhrase": "a very short phrase (4-6 words) that isolates the target sound for drilling"
}
Keep feedback concrete and beginner-friendly. Avoid jargon.`;

/** Calls Gemini for specific pronunciation tips on the target sound. */
export async function generatePronunciationFeedback(
  targetSound: string,
  spokenText: string,
  targetText: string
): Promise<PronunciationFeedback> {
  const userMsg = `Target phrase: "${targetText}"\nSpoken: "${spokenText}"\nTarget sound: ${targetSound}`;

  const raw = await askCoach({
    system: FEEDBACK_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
    maxTokens: 300,
    temperature: 0.4,
  });

  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { feedback: cleaned, drillPhrase: targetText.split(" ").slice(0, 4).join(" ") };
  }

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as PronunciationFeedback;
    return parsed;
  } catch {
    return { feedback: cleaned, drillPhrase: targetText.split(" ").slice(0, 4).join(" ") };
  }
}

/** Inserts a pronunciation error into the errors table. */
export async function savePronunciationError(userId: string, word: string): Promise<void> {
  await supabase.from("errors").insert({
    user_id: userId,
    session_id: null,
    error_type: "pronunciation_error",
    original_text: word,
  });
}
