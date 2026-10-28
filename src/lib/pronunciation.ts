import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";
import { speechSupported } from "./speech";
import { createSpeechSession } from "./useSpeechCapture";
import { getPhrasesByLevel, type PronunciationPhrase } from "./pronunciationPhrases";
import { tryParseAiJson } from "./json";

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

/**
 * Adaptador Promise sobre el motor canónico (createSpeechSession) para
 * Pronunciation.tsx, que captura dentro de un flujo async y no puede usar el
 * hook. NO es una implementación alternativa: comparte el mismo motor y las
 * mismas reglas anti-duplicación que useSpeechCapture.
 *
 * Resuelve con el texto acumulado del turno, o null si no se capturó nada.
 * Al vencer timeoutMs cierra la captura y resuelve con lo que haya.
 */
export function recognizeSpeech(lang = "en-GB", timeoutMs = 20000): Promise<string | null> {
  if (!speechSupported()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const session = createSpeechSession({
      lang,
      mode: "turn",
      onDone: (text) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(text.trim() || null);
      },
    });

    if (!session) { resolve(null); return; }

    // El timeout solo pide el cierre; onDone es siempre quien resuelve.
    timer = setTimeout(() => session.stop(), timeoutMs);
  });
}

/** Normalises a word for comparison: lowercase, strip punctuation, preserve accents. */
function normalise(w: string): string {
  return w.toLowerCase().replace(/[^a-zàèòçïü']/g, "");
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

  // Si la IA no devuelve JSON usable, se muestra su texto tal cual y una frase corta para repetir.
  return (
    tryParseAiJson<PronunciationFeedback>(raw) ?? {
      feedback: raw.trim(),
      drillPhrase: targetText.split(" ").slice(0, 4).join(" "),
    }
  );
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
