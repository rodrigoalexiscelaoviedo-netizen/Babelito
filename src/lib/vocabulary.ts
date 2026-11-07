import { supabase } from "./supabaseClient";
import { scopeByLanguage } from "./language";

export type WordStatus = "new" | "learning" | "known";

export type VocabMap = Record<
  string,
  { status: WordStatus; definition?: string; example?: string; phonetic?: string }
>;

export interface VocabWord {
  id: string;
  user_id: string;
  word: string;
  status: WordStatus;
  definition: string | null;
  example: string | null;
  phonetic: string | null;
  source: string | null;
  times_seen: number;
  created_at: string;
  updated_at: string;
}

export async function getVocabulary(userId: string, language: string): Promise<VocabWord[]> {
  const { data } = await scopeByLanguage(
    supabase.from("user_vocabulary").select("*").eq("user_id", userId),
    language
  ).order("updated_at", { ascending: false });
  return (data as VocabWord[]) ?? [];
}

export async function upsertWord(
  userId: string,
  word: string,
  meta: {
    status?: WordStatus;
    definition?: string;
    example?: string;
    phonetic?: string;
    source?: string;
  },
  language: string
): Promise<void> {
  const lower = word.toLowerCase().trim();
  const { data: existing } = await scopeByLanguage(
    supabase.from("user_vocabulary").select("id, times_seen").eq("user_id", userId).eq("word", lower),
    language
  ).maybeSingle();

  // La columna `phonetic` falta en algunas bases (el esquema se armó a mano): si es el caso se
  // guarda igual sin ella. Antes el error se perdía y la palabra nunca llegaba a "Mis palabras".
  const write = async (fields: typeof meta) => {
    if (existing) {
      return supabase
        .from("user_vocabulary")
        .update({
          ...fields,
          times_seen: ((existing as { times_seen: number }).times_seen ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (existing as { id: string }).id);
    }
    return supabase.from("user_vocabulary").insert({
      user_id: userId,
      word: lower,
      times_seen: 1,
      language,
      ...fields,
    });
  };

  let { error } = await write(meta);
  if (error && /phonetic/i.test(error.message)) {
    const { phonetic: _omit, ...withoutPhonetic } = meta;
    ({ error } = await write(withoutPhonetic));
  }
  if (error) throw new Error(error.message);
}

// updateWordStatus se eliminó: nunca se llamó desde ningún módulo y upsertWord
// ya cubre el cambio de estado (ver ClickableText.markStatus).
