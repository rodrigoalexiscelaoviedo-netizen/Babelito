import { localDateISO, timestampToLocalDate } from "./dates";
import { supabase } from "./supabaseClient";
import { scopeByLanguage } from "./language";

export interface ChunkData {
  id: number;
  english: string;
  spanish: string;
  category: string | null;
}

export interface DailyLesson {
  id: string;
  user_id: string;
  lesson_date: string;
  chunk_id: number | null;
  word: string | null;
  topic: string;
  completed: boolean;
  completed_at: string | null;
  chunk_done: boolean;
  convo_done: boolean;
  word_done: boolean;
  // Joined at read time — not a DB column
  chunk?: ChunkData | null;
}

export type LessonItem = "chunk_done" | "convo_done" | "word_done";

/**
 * Ítems que realmente cuentan hoy. La palabra del día solo entra si existe:
 * sin vocabulario en 'learning' la práctica se cierra con 2 ítems, no con 3.
 */
export function activeItems(lesson: DailyLesson): LessonItem[] {
  return lesson.word
    ? ["chunk_done", "convo_done", "word_done"]
    : ["chunk_done", "convo_done"];
}

export function isTriadComplete(lesson: DailyLesson): boolean {
  return activeItems(lesson).every((k) => lesson[k]);
}

function getConversationTopics(language: string): string[] {
  if (language === "ca") {
    return [
      "La teva rutina del matí",
      "Un lloc que t'agrada de Barcelona",
      "El que has fet aquest cap de setmana",
      "Una afició teva",
      "El teu barri",
      "Menjar que t'agrada cuinar",
      "Un repte que has superat",
      "La teva família i els teus amics",
    ];
  }
  return [
    "Your morning routine",
    "A hobby you enjoy",
    "Your favourite place to visit",
    "How technology affects your life",
    "A book or film you liked recently",
    "Your goals for this month",
    "A challenge you overcame",
    "What you find most interesting about your job",
  ];
}

function todayISO(): string {
  return localDateISO();
}

/** Devuelve una palabra al azar del vocabulario en 'learning', o null. */
async function pickLearningWord(userId: string, language: string): Promise<string | null> {
  const { data } = await scopeByLanguage(
    supabase.from("user_vocabulary").select("word").eq("user_id", userId).eq("status", "learning"),
    language
  ).limit(20);
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)] as { word: string };
  return pick.word;
}

/** Fetches the chunk row for a given bigint id. Returns null if not found. */
async function fetchChunk(chunkId: number): Promise<ChunkData | null> {
  const { data } = await supabase
    .from("chunks")
    .select("id, english, spanish, category")
    .eq("id", chunkId)
    .maybeSingle();
  return data as ChunkData | null;
}

export async function getTodayLesson(userId: string, language: string): Promise<DailyLesson> {
  const today = todayISO();

  // Check if lesson already exists for today
  const { data: existing } = await scopeByLanguage(
    supabase.from("daily_lessons").select("*").eq("user_id", userId).eq("lesson_date", today),
    language
  ).maybeSingle();

  if (existing) {
    const lesson = existing as DailyLesson;
    // La palabra se elegía solo al crear la fila: si ese día todavía no había
    // vocabulario en 'learning', quedaba null para siempre aunque el usuario
    // agregara palabras después. Se completa retroactivamente.
    if (!lesson.word) {
      const word = await pickLearningWord(userId, language);
      if (word) {
        const { data: updated } = await supabase
          .from("daily_lessons")
          .update({ word })
          .eq("id", lesson.id)
          .select("*")
          .maybeSingle();
        if (updated) Object.assign(lesson, updated as DailyLesson);
      }
    }
    if (lesson.chunk_id) {
      lesson.chunk = await fetchChunk(lesson.chunk_id);
    }
    return lesson;
  }

  // Exclude chunk_ids used in last 3 daily_lessons
  const { data: recentLessons } = await scopeByLanguage(
    supabase.from("daily_lessons").select("chunk_id").eq("user_id", userId),
    language
  )
    .order("lesson_date", { ascending: false })
    .limit(3);

  const recentChunkIds: number[] = (recentLessons ?? [])
    .map((l: { chunk_id: number | null }) => l.chunk_id)
    .filter((id: number | null): id is number => id !== null);

  let chunkId: number | null = null;
  let chunk: ChunkData | null = null;

  // Try to find a chunk not used recently
  const exclusionList = recentChunkIds.length > 0
    ? `(${recentChunkIds.join(",")})`
    : "(0)";

  const { data: freshChunks } = await scopeByLanguage(
    supabase.from("chunks").select("id, english, spanish, category").not("id", "in", exclusionList),
    language
  ).limit(20);

  if (freshChunks && freshChunks.length > 0) {
    const pick = freshChunks[Math.floor(Math.random() * freshChunks.length)] as ChunkData;
    chunkId = pick.id;
    chunk = pick;
  } else {
    // Fallback: any chunk
    const { data: anyChunks } = await scopeByLanguage(
      supabase.from("chunks").select("id, english, spanish, category"),
      language
    ).limit(10);
    if (anyChunks && anyChunks.length > 0) {
      const pick = anyChunks[Math.floor(Math.random() * anyChunks.length)] as ChunkData;
      chunkId = pick.id;
      chunk = pick;
    }
  }

  const word = await pickLearningWord(userId, language);

  // Pick topic
  const topics = getConversationTopics(language);
  const topic = topics[Math.floor(Math.random() * topics.length)];

  // Insert lesson — only columns that actually exist in daily_lessons
  const { data: inserted, error } = await supabase
    .from("daily_lessons")
    .insert({
      user_id: userId,
      lesson_date: today,
      chunk_id: chunkId,
      word,
      topic,
      completed: false,
      completed_at: null,
      language,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const lesson = inserted as DailyLesson;
  lesson.chunk = chunk;
  return lesson;
}

/**
 * Persiste el tilde de un ítem de la tríada en la fila de hoy y devuelve la
 * fila fresca. Antes los tildes vivían solo en estado de React y se perdían al
 * recargar o al navegar a otro módulo.
 */
export async function setLessonItem(
  userId: string,
  language: string,
  item: LessonItem,
  value: boolean
): Promise<DailyLesson> {
  const { data, error } = await scopeByLanguage(
    supabase.from("daily_lessons").update({ [item]: value }).eq("user_id", userId).eq("lesson_date", todayISO()),
    language
  )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as DailyLesson;
}

/**
 * Cierra la práctica del día. Solo marca completed si todos los ítems ACTIVOS
 * están tildados (ver activeItems: sin palabra del día alcanza con 2).
 */
export async function completeLesson(userId: string, language: string): Promise<DailyLesson> {
  const { data: current, error: readErr } = await scopeByLanguage(
    supabase.from("daily_lessons").select("*").eq("user_id", userId).eq("lesson_date", todayISO()),
    language
  ).single();
  if (readErr) throw new Error(readErr.message);

  const lesson = current as DailyLesson;
  if (!isTriadComplete(lesson)) {
    throw new Error("Todavía faltan tareas de la práctica de hoy.");
  }

  const { data, error } = await supabase
    .from("daily_lessons")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", lesson.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as DailyLesson;
}

/**
 * Monthly freeze reset: if last_freeze_reset is from a previous month, restore to 2.
 * Returns the current (possibly just-refreshed) freeze count.
 */
async function ensureFreezesFresh(userId: string): Promise<{ freezesLeft: number }> {
  const { data } = await supabase
    .from("profiles")
    .select("streak_freezes, last_freeze_reset")
    .eq("id", userId)
    .maybeSingle();

  const today = new Date();
  const currentYM = `${today.getFullYear()}-${today.getMonth()}`;
  const lastReset = data?.last_freeze_reset ? new Date(data.last_freeze_reset as string) : null;
  const lastYM = lastReset ? `${lastReset.getFullYear()}-${lastReset.getMonth()}` : null;

  if (lastYM !== currentYM) {
    // New month — restore freezes
    const { error } = await supabase
      .from("profiles")
      .update({ streak_freezes: 2, last_freeze_reset: todayISO() })
      .eq("id", userId);
    if (error) console.error("No se pudo renovar los freezes:", error.message);
    return { freezesLeft: 2 };
  }

  return { freezesLeft: (data?.streak_freezes as number) ?? 0 };
}

export interface StreakInfo {
  streak: number;
  freezesLeft: number;
}

/**
 * Returns streak and remaining freezes.
 * When consume=true (default), persists freeze usage to DB.
 * Use consume=false for read-only views (Progress, Nav badge).
 */
export async function getStreakInfo(userId: string, consume = true): Promise<StreakInfo> {
  const { freezesLeft: initialFreezes } = await ensureFreezesFresh(userId);

  const [{ data: dlData }, { data: sessData }, { data: storyData }] = await Promise.all([
    supabase
      .from("daily_lessons")
      .select("lesson_date")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("lesson_date", { ascending: false })
      .limit(400),
    supabase
      .from("sessions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("story_progress")
      .select("created_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const activeDates = new Set<string>();
  (dlData ?? []).forEach((r: { lesson_date: string }) => activeDates.add(r.lesson_date));
  (sessData ?? []).forEach((r: { created_at: string }) => activeDates.add(timestampToLocalDate(r.created_at)));
  (storyData ?? []).forEach((r: { created_at: string }) => activeDates.add(timestampToLocalDate(r.created_at)));

  if (activeDates.size === 0) return { streak: 0, freezesLeft: initialFreezes };

  const cursor = new Date();
  let cursorStr = localDateISO(cursor);
  let streak = 0;
  let freezesUsed = 0;

  // Grace period: if today not done yet, start from yesterday
  if (!activeDates.has(cursorStr)) {
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = localDateISO(cursor);
  }

  for (let i = 0; i < 400; i++) {
    if (activeDates.has(cursorStr)) {
      streak++;
    } else if (freezesUsed < initialFreezes) {
      // Freeze covers one missing day — streak continues, day not counted
      freezesUsed++;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = localDateISO(cursor);
  }

  const freezesLeft = Math.max(0, initialFreezes - freezesUsed);

  if (consume && freezesUsed > 0) {
    const { error } = await supabase
      .from("profiles")
      .update({ streak_freezes: freezesLeft })
      .eq("id", userId);
    if (error) console.error("No se pudo consumir los freezes:", error.message);
  }

  return { streak, freezesLeft };
}

export async function getStreak(userId: string): Promise<number> {
  return (await getStreakInfo(userId, false)).streak;
}

export async function getFreezeCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("streak_freezes")
    .eq("id", userId)
    .maybeSingle();
  return (data?.streak_freezes as number) ?? 0;
}
