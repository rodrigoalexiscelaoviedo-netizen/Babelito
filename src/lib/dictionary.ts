import { askCoach } from "./claude";
import { supabase } from "./supabaseClient";

export type LearningLang = "en" | "ca";

export interface WordDefinition {
  /** Definición en español (siempre). */
  definition_es: string;
  /** Definición en el idioma que se aprende (inglés o catalán). */
  definition_target: string;
  example: string;
  phonetic: string;
}

export interface PhraseExplanation {
  es: string;
  grammar: string;
}

const WORD_SYSTEM: Record<LearningLang, string> = {
  en: `You are an English dictionary for Spanish-speaking students.
For the given word respond ONLY with a single valid JSON object, no markdown, no extra text:
{"definition_es":"...","definition_target":"...","example":"...","phonetic":"..."}
definition_es: brief Spanish definition. definition_target: brief English definition.
phonetic: IPA between forward slashes, e.g. /wɜːd/. Keep each definition to one sentence.`,
  ca: `You are a Catalan dictionary for Spanish-speaking students.
For the given word respond ONLY with a single valid JSON object, no markdown, no extra text:
{"definition_es":"...","definition_target":"...","example":"...","phonetic":"..."}
definition_es: brief Spanish definition. definition_target: brief Catalan definition.
example: one short natural Catalan sentence using the word. phonetic: IPA between forward slashes using Central Catalan pronunciation. Keep each definition to one sentence.`,
};

const PHRASE_SYSTEM: Record<LearningLang, string> = {
  en: `You are an English teacher for Spanish-speaking students.
Explain the given English phrase or sentence in Spanish.
Respond ONLY with a single valid JSON object, no markdown, no extra text:
{"es":"...","grammar":"..."}
"es": natural Spanish translation (1 sentence). "grammar": brief grammar or vocabulary note in Spanish (1 short sentence).`,
  ca: `Ets professor de català per a estudiants hispanohablants.
Explica la frase catalana donada en espanyol.
Respon NOMÉS amb un objecte JSON vàlid, sense markdown ni text extra:
{"es":"...","grammar":"..."}
"es": traducció natural al castellà (1 frase). "grammar": nota breu de gramàtica o vocabulari en castellà (1 frase curta).`,
};

const UNAVAILABLE: WordDefinition = {
  definition_es: "No disponible",
  definition_target: "",
  example: "",
  phonetic: "",
};

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/**
 * Definición de palabra. Primero mira la caché compartida (word_definitions):
 * cada palabra se consulta al coach UNA sola vez para todos los usuarios, lo que
 * ahorra cuota de Gemini. Solo se cachean respuestas válidas.
 */
export async function lookupWord(word: string, language: LearningLang = "en"): Promise<WordDefinition> {
  const key = word.toLowerCase().trim();
  if (!key) return UNAVAILABLE;

  const { data: cached } = await supabase
    .from("word_definitions")
    .select("data")
    .eq("lang", language)
    .eq("word", key)
    .maybeSingle();
  if (cached?.data) return cached.data as WordDefinition;

  try {
    const raw = await askCoach({
      system: WORD_SYSTEM[language],
      messages: [{ role: "user", content: key }],
      maxTokens: 200,
      temperature: 0.1,
    });
    const def = parseJson<WordDefinition>(raw);
    await supabase
      .from("word_definitions")
      .upsert({ lang: language, word: key, data: def }, { onConflict: "lang,word", ignoreDuplicates: true });
    return def;
  } catch {
    return UNAVAILABLE;
  }
}

export async function lookupPhrase(phrase: string, language: LearningLang = "en"): Promise<PhraseExplanation> {
  try {
    const raw = await askCoach({
      system: PHRASE_SYSTEM[language],
      messages: [{ role: "user", content: phrase.trim() }],
      maxTokens: 200,
      temperature: 0.1,
    });
    return parseJson<PhraseExplanation>(raw);
  } catch {
    return { es: "No disponible", grammar: "" };
  }
}

export function dictLang(learningLanguage?: string | null): LearningLang {
  return learningLanguage === "ca" ? "ca" : "en";
}
