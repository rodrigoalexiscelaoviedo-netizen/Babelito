import { supabase } from "./supabaseClient";

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
  // Joined at read time — not a DB column
  chunk?: ChunkData | null;
}

const CONVERSATION_TOPICS = [
  "Your morning routine",
  "A hobby you enjoy",
  "Your favourite place to visit",
  "How technology affects your life",
  "A book or film you liked recently",
  "Your goals for this month",
  "A challenge you overcame",
  "What you find most interesting about your job",
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

export async function getTodayLesson(userId: string): Promise<DailyLesson> {
  const today = todayISO();

  // Check if lesson already exists for today
  const { data: existing } = await supabase
    .from("daily_lessons")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_date", today)
    .maybeSingle();

  if (existing) {
    const lesson = existing as DailyLesson;
    if (lesson.chunk_id) {
      lesson.chunk = await fetchChunk(lesson.chunk_id);
    }
    return lesson;
  }

  // Exclude chunk_ids used in last 3 daily_lessons
  const { data: recentLessons } = await supabase
    .from("daily_lessons")
    .select("chunk_id")
    .eq("user_id", userId)
    .order("lesson_date", { ascending: false })
    .limit(3);

  const recentChunkIds: number[] = (recentLessons ?? [])
    .map((l: { chunk_id: number | null }) => l.chunk_id)
    .filter((id): id is number => id !== null);

  let chunkId: number | null = null;
  let chunk: ChunkData | null = null;

  // Try to find a chunk not used recently
  const exclusionList = recentChunkIds.length > 0
    ? `(${recentChunkIds.join(",")})`
    : "(0)";

  const { data: freshChunks } = await supabase
    .from("chunks")
    .select("id, english, spanish, category")
    .not("id", "in", exclusionList)
    .limit(20);

  if (freshChunks && freshChunks.length > 0) {
    const pick = freshChunks[Math.floor(Math.random() * freshChunks.length)] as ChunkData;
    chunkId = pick.id;
    chunk = pick;
  } else {
    // Fallback: any chunk
    const { data: anyChunks } = await supabase
      .from("chunks")
      .select("id, english, spanish, category")
      .limit(10);
    if (anyChunks && anyChunks.length > 0) {
      const pick = anyChunks[Math.floor(Math.random() * anyChunks.length)] as ChunkData;
      chunkId = pick.id;
      chunk = pick;
    }
  }

  // Pick vocab word with status='learning'
  let word: string | null = null;
  const { data: learningWords } = await supabase
    .from("user_vocabulary")
    .select("word")
    .eq("user_id", userId)
    .eq("status", "learning")
    .limit(20);

  if (learningWords && learningWords.length > 0) {
    const pick = learningWords[Math.floor(Math.random() * learningWords.length)] as { word: string };
    word = pick.word;
  }

  // Pick topic
  const topic = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];

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
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const lesson = inserted as DailyLesson;
  lesson.chunk = chunk;
  return lesson;
}

export async function completeLesson(userId: string): Promise<void> {
  const today = todayISO();
  await supabase
    .from("daily_lessons")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("lesson_date", today);
}

export async function getStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_lessons")
    .select("lesson_date")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("lesson_date", { ascending: false })
    .limit(365);

  if (!data || data.length === 0) return 0;

  const completedDates = new Set((data as { lesson_date: string }[]).map((r) => r.lesson_date));
  let streak = 0;
  const cursor = new Date();
  let cursorStr = cursor.toISOString().slice(0, 10);

  // Allow streak if today not yet done but yesterday was
  if (!completedDates.has(cursorStr)) {
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = cursor.toISOString().slice(0, 10);
  }

  while (completedDates.has(cursorStr)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = cursor.toISOString().slice(0, 10);
  }

  return streak;
}
