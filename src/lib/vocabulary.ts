import { supabase } from "./supabaseClient";

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

export async function getVocabulary(userId: string): Promise<VocabWord[]> {
  const { data } = await supabase
    .from("user_vocabulary")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
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
  }
): Promise<void> {
  const lower = word.toLowerCase().trim();
  const { data: existing } = await supabase
    .from("user_vocabulary")
    .select("id, times_seen")
    .eq("user_id", userId)
    .eq("word", lower)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_vocabulary")
      .update({
        ...meta,
        times_seen: ((existing as { times_seen: number }).times_seen ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id);
  } else {
    await supabase.from("user_vocabulary").insert({
      user_id: userId,
      word: lower,
      times_seen: 1,
      ...meta,
    });
  }
}

export async function updateWordStatus(
  userId: string,
  word: string,
  status: WordStatus
): Promise<void> {
  await supabase
    .from("user_vocabulary")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("word", word.toLowerCase().trim());
}
