import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";

export interface StoryQuestion {
  question: string;
  options: [string, string, string, string];
  correct_index: number;
}

export interface Story {
  id: string;
  title: string;
  level: string;
  topic: string;
  content: string;
  source: "preloaded" | "ai_generated";
  user_id: string | null;
  questions: StoryQuestion[];
  created_at: string;
}

export interface StoryProgress {
  id: string;
  user_id: string;
  story_id: string;
  completed: boolean;
  score: number;
  created_at: string;
}

export async function getStories(userId: string, level?: string): Promise<Story[]> {
  let query = supabase
    .from("stories")
    .select("*")
    .or(`source.eq.preloaded,and(source.eq.ai_generated,user_id.eq.${userId})`)
    .order("created_at", { ascending: false });

  if (level) query = query.eq("level", level);

  const { data } = await query;
  return (data as Story[]) ?? [];
}

export async function getStoryProgress(userId: string): Promise<StoryProgress[]> {
  const { data } = await supabase
    .from("story_progress")
    .select("*")
    .eq("user_id", userId);
  return (data as StoryProgress[]) ?? [];
}

export async function saveStoryProgress(
  userId: string,
  storyId: string,
  score: number
): Promise<void> {
  await supabase.from("story_progress").upsert(
    { user_id: userId, story_id: storyId, completed: true, score },
    { onConflict: "user_id,story_id" }
  );
}

const GENERATE_SYSTEM = `You are an English story generator for language learners.
Generate a reading comprehension story. Respond ONLY with a single valid JSON object — no markdown, no extra text:
{
  "title": "...",
  "content": "...",
  "questions": [
    {"question":"...","options":["A","B","C","D"],"correct_index":0}
  ]
}
Rules:
- content: 200-350 words, British English, clear narrative, engaging
- 3-4 comprehension questions, each with exactly 4 options
- correct_index is 0-based (0=first option)
- Keep the level appropriate: A2=simple vocabulary, B1=moderate, B2=advanced idioms`;

export async function generateStory(
  topic: string,
  level: string,
  interests?: string
): Promise<Story> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const userMsg = `Topic: ${topic}. Level: ${level}.${interests ? ` Context/interests: ${interests}.` : ""}`;

  const raw = await askCoach({
    system: GENERATE_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
    maxTokens: 1500,
    temperature: 0.8,
  });

  // Parse JSON (strip markdown if present)
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    console.error("generateStory: unexpected AI response (no JSON found):", raw);
    throw new Error("El coach está ocupado ahora mismo. Probá de nuevo en un momento.");
  }

  let parsed: { title: string; content: string; questions: StoryQuestion[] };
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    console.error("generateStory: JSON parse failed. Raw:", raw);
    throw new Error("El coach está ocupado ahora mismo. Probá de nuevo en un momento.");
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      title: parsed.title,
      level,
      topic,
      content: parsed.content,
      source: "ai_generated",
      user_id: userId,
      questions: parsed.questions,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Story;
}
