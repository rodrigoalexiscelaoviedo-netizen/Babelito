import { supabase } from "./supabaseClient";
import { getStreak } from "./dailyLesson";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  hint: string;
  icon: string; // lucide icon name
  color: "coral" | "mint" | "gold";
}

export interface AchievementWithStatus extends AchievementDef {
  unlocked: boolean;
  seen: boolean;
  unlocked_at: string | null;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_conversation",
    title: "First Words",
    description: "Had your first conversation with the coach.",
    hint: "Start a conversation with your coach.",
    icon: "MessageCircle",
    color: "coral",
  },
  {
    key: "first_story",
    title: "Story Seeker",
    description: "Completed your first story.",
    hint: "Finish any story in the Stories module.",
    icon: "BookOpen",
    color: "mint",
  },
  {
    key: "first_review",
    title: "Memory Builder",
    description: "Completed your first oral review session.",
    hint: "Add words to your deck and complete a review.",
    icon: "Layers",
    color: "gold",
  },
  {
    key: "sounds_10",
    title: "Phonetic Explorer",
    description: "Logged 10 pronunciation attempts across any module.",
    hint: "Use the shadowing feature in any module 10 times.",
    icon: "Mic",
    color: "coral",
  },
  {
    key: "words_50",
    title: "Word Collector",
    description: "Added 50 words to your vocabulary.",
    hint: "Track 50 words via Reading or Stories.",
    icon: "BookMarked",
    color: "mint",
  },
  {
    key: "streak_7",
    title: "Week Warrior",
    description: "Kept a 7-day practice streak.",
    hint: "Practice 7 days in a row.",
    icon: "Flame",
    color: "coral",
  },
  {
    key: "streak_30",
    title: "Monthly Master",
    description: "Kept a 30-day practice streak.",
    hint: "Practice 30 days in a row.",
    icon: "Flame",
    color: "gold",
  },
  {
    key: "streak_100",
    title: "Centurion",
    description: "Kept a 100-day practice streak.",
    hint: "Practice 100 days in a row.",
    icon: "Trophy",
    color: "gold",
  },
];

/** Evaluates all achievement conditions and inserts newly earned ones.
 *  Returns the AchievementDef entries that were just unlocked (not previously in DB).
 */
export async function checkAchievements(userId: string): Promise<AchievementDef[]> {
  const [{ data: existing }, { count: convCount }, { count: storyCount }, { count: reviewCount }, { count: errorCount }, { count: vocabCount }, streak] =
    await Promise.all([
      supabase.from("achievements").select("key").eq("user_id", userId),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_type", "conversation"),
      supabase.from("story_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
      supabase.from("review_items").select("id", { count: "exact", head: true }).eq("user_id", userId).not("last_reviewed", "is", null),
      supabase.from("errors").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("user_vocabulary").select("id", { count: "exact", head: true }).eq("user_id", userId),
      getStreak(userId),
    ]);

  const unlockedKeys = new Set((existing ?? []).map((r: { key: string }) => r.key));

  const conditions: Record<string, boolean> = {
    first_conversation: (convCount ?? 0) >= 1,
    first_story: (storyCount ?? 0) >= 1,
    first_review: (reviewCount ?? 0) >= 1,
    sounds_10: (errorCount ?? 0) >= 10,
    words_50: (vocabCount ?? 0) >= 50,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    streak_100: streak >= 100,
  };

  const newlyUnlocked = ACHIEVEMENTS.filter(
    (def) => !unlockedKeys.has(def.key) && conditions[def.key]
  );

  if (newlyUnlocked.length > 0) {
    await supabase.from("achievements").insert(
      newlyUnlocked.map((def) => ({
        user_id: userId,
        key: def.key,
        seen: false,
      }))
    );
  }

  return newlyUnlocked;
}

/** Returns all 8 achievements with their unlock status for the gallery. */
export async function getAchievements(userId: string): Promise<AchievementWithStatus[]> {
  const { data } = await supabase
    .from("achievements")
    .select("key, seen, created_at")
    .eq("user_id", userId);

  const map = new Map(
    (data ?? []).map((r: { key: string; seen: boolean; created_at: string }) => [r.key, r])
  );

  return ACHIEVEMENTS.map((def) => {
    const row = map.get(def.key);
    return {
      ...def,
      unlocked: !!row,
      seen: row?.seen ?? true,
      unlocked_at: row?.created_at ?? null,
    };
  });
}

/** Marks listed achievement keys as seen (so they don't re-celebrate). */
export async function markSeen(userId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await supabase
    .from("achievements")
    .update({ seen: true })
    .eq("user_id", userId)
    .in("key", keys);
}
