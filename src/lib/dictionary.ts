import { askCoach } from "./claude";
import { supabase } from "./supabaseClient";
import { parseAiJson } from "./json";

export type LearningLang = "en" | "ca";

/** Una forma de uso frecuente: la expresión y su equivalente en español. */
export interface WordUse {
  en: string;
  es: string;
}

export interface WordDefinition {
  /** Traducción corta al español (1–3 equivalentes). Es lo que se ve primero. */
  translation: string;
  /** Categoría gramatical en español ("verbo", "sustantivo"…). */
  pos: string;
  /** Hasta 2 usos o formas habituales (verbos con partícula, expresiones, otro sentido). */
  uses: WordUse[];
  example: string;
  example_es: string;
  phonetic: string;
  /** Igual que `translation`; se mantiene porque otras pantallas y la tabla de vocabulario lo guardan. */
  definition_es: string;
  /** Ya no se pide ni se muestra; queda por compatibilidad con filas antiguas de la caché. */
  definition_target: string;
}

export interface PhraseExplanation {
  es: string;
  /** Hasta 2 expresiones útiles de la frase, para aprender de ella. */
  keys: WordUse[];
  /** Compatibilidad con respuestas antiguas. */
  grammar: string;
}

const WORD_FORMAT = `{"translation":"...","pos":"...","uses":[{"en":"...","es":"..."}],"example":"...","example_es":"...","phonetic":"..."}`;

const WORD_SYSTEM: Record<LearningLang, string> = {
  en: `You are an English-Spanish dictionary for Spanish-speaking learners.
For the given English word respond ONLY with a single valid JSON object, no markdown, no extra text:
${WORD_FORMAT}
translation: the 1 to 3 most common Spanish equivalents, separated by commas. Never a definition, just the words (e.g. "salir, irse").
pos: part of speech in Spanish (verbo, sustantivo, adjetivo, adverbio, preposición, conjunción…).
uses: 1 or 2 other very common ways this word is used (phrasal verbs, fixed expressions or another meaning). Each one is a short English phrase and its short Spanish equivalent. Use an empty array if there is nothing useful.
example: one short natural English sentence (max 10 words) that uses the word. example_es: its Spanish translation.
phonetic: IPA between forward slashes, e.g. /wɜːd/.`,
  ca: `You are a Catalan-Spanish dictionary for Spanish-speaking learners.
For the given Catalan word respond ONLY with a single valid JSON object, no markdown, no extra text:
${WORD_FORMAT}
translation: the 1 to 3 most common Spanish equivalents, separated by commas. Never a definition, just the words.
pos: part of speech in Spanish (verbo, sustantivo, adjetivo, adverbio, preposición…).
uses: 1 or 2 other very common ways this word is used. Each one is a short Catalan phrase and its short Spanish equivalent. Empty array if nothing useful.
example: one short natural Catalan sentence (max 10 words) using the word. example_es: its Spanish translation.
phonetic: IPA between forward slashes using Central Catalan pronunciation.`,
};

const PHRASE_FORMAT = `{"es":"...","keys":[{"en":"...","es":"..."}]}`;

const PHRASE_SYSTEM: Record<LearningLang, string> = {
  en: `You are an English teacher for Spanish-speaking students.
Respond ONLY with a single valid JSON object, no markdown, no extra text:
${PHRASE_FORMAT}
"es": natural Spanish translation of the whole sentence.
"keys": up to 2 expressions from the sentence that are worth learning (phrasal verbs, collocations, fixed phrases), each as the English expression and its short Spanish equivalent. Empty array if the sentence has none.`,
  ca: `Ets professor de català per a estudiants hispanohablants.
Respon NOMÉS amb un objecte JSON vàlid, sense markdown ni text extra:
${PHRASE_FORMAT}
"es": traducció natural al castellà de tota la frase.
"keys": fins a 2 expressions de la frase que valguin la pena (locucions, col·locacions), cadascuna amb l'expressió catalana a "en" i el seu equivalent breu en castellà a "es". Llista buida si no n'hi ha.`,
};

const UNAVAILABLE: WordDefinition = {
  translation: "",
  pos: "",
  uses: [],
  example: "",
  example_es: "",
  phonetic: "",
  definition_es: "No disponible",
  definition_target: "",
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function cleanUses(v: unknown): WordUse[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((u) => ({ en: str((u as WordUse)?.en), es: str((u as WordUse)?.es) }))
    .filter((u) => u.en && u.es)
    .slice(0, 2);
}

/** ¿Tiene la forma nueva? Las filas viejas de la caché solo traían definiciones largas. */
export function isCompactWord(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && str((raw as WordDefinition).translation) !== "";
}

/** Normaliza cualquier respuesta (nueva o antigua) a la forma actual. Puro y testeado. */
export function normalizeWord(raw: unknown): WordDefinition {
  const r = (raw ?? {}) as Partial<WordDefinition>;
  const translation = str(r.translation) || str(r.definition_es);
  return {
    translation,
    pos: str(r.pos),
    uses: cleanUses(r.uses),
    example: str(r.example),
    example_es: str(r.example_es),
    phonetic: str(r.phonetic),
    definition_es: translation,
    definition_target: str(r.definition_target),
  };
}

export function normalizePhrase(raw: unknown): PhraseExplanation {
  const r = (raw ?? {}) as Partial<PhraseExplanation>;
  return { es: str(r.es), keys: cleanUses(r.keys), grammar: str(r.grammar) };
}

/**
 * Definición de palabra. Primero mira la caché compartida (word_definitions):
 * cada palabra se consulta al coach UNA sola vez para todos los usuarios, lo que
 * ahorra cuota de Gemini. Las filas con el formato viejo se vuelven a pedir y se
 * actualizan. Solo se cachean respuestas válidas.
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
  if (cached?.data && isCompactWord(cached.data)) return normalizeWord(cached.data);

  try {
    const raw = await askCoach({
      json: true,
      system: WORD_SYSTEM[language],
      messages: [{ role: "user", content: key }],
      maxTokens: 400,
      temperature: 0.1,
    });
    const def = normalizeWord(parseAiJson<WordDefinition>(raw));
    if (!def.translation) return UNAVAILABLE;
    // Se guarda también sobre una fila vieja; si la política no lo permite, se ignora el error.
    await supabase.from("word_definitions").upsert({ lang: language, word: key, data: def }, { onConflict: "lang,word" });
    return def;
  } catch {
    return UNAVAILABLE;
  }
}

export async function lookupPhrase(phrase: string, language: LearningLang = "en"): Promise<PhraseExplanation> {
  try {
    const raw = await askCoach({
      json: true,
      system: PHRASE_SYSTEM[language],
      messages: [{ role: "user", content: phrase.trim() }],
      maxTokens: 400,
      temperature: 0.1,
    });
    const out = normalizePhrase(parseAiJson<PhraseExplanation>(raw));
    return out.es ? out : { es: "No disponible", keys: [], grammar: "" };
  } catch {
    return { es: "No disponible", keys: [], grammar: "" };
  }
}

export function dictLang(learningLanguage?: string | null): LearningLang {
  return learningLanguage === "ca" ? "ca" : "en";
}
