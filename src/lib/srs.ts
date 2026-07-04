import { supabase } from "./supabaseClient";

export interface ReviewItem {
  id: string;
  user_id: string;
  item_type: "chunk" | "word";
  content: string;       // English phrase / word to say
  prompt: string;        // Spanish or context shown before reveal
  source_ref: string;    // chunk id (stringified) or vocabulary word
  interval_days: number;
  ease: number;
  reps: number;
  next_review: string;   // ISO date "YYYY-MM-DD"
  last_reviewed: string | null;
}

export type ReviewQuality = "good" | "again";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return toDateStr(new Date());
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** SM-2 adapted: quality is derived from speech recognizer, not user input. */
export function calcNextReview(
  item: Pick<ReviewItem, "reps" | "interval_days" | "ease">,
  quality: ReviewQuality
): Pick<ReviewItem, "reps" | "interval_days" | "ease" | "next_review"> {
  if (quality === "again") {
    const newEase = Math.max(1.3, item.ease - 0.15);
    return {
      reps: 0,
      interval_days: 1,
      ease: parseFloat(newEase.toFixed(2)),
      next_review: addDays(1),
    };
  }

  // quality === "good"
  const newReps = item.reps + 1;
  let newInterval: number;
  if (newReps === 1) {
    newInterval = 1;
  } else if (newReps === 2) {
    newInterval = 3;
  } else {
    newInterval = Math.round(item.interval_days * item.ease);
  }
  const newEase = Math.min(2.8, item.ease + 0.1);

  return {
    reps: newReps,
    interval_days: newInterval,
    ease: parseFloat(newEase.toFixed(2)),
    next_review: addDays(newInterval),
  };
}

/** Returns review items due today or earlier, ordered by next_review asc. */
export async function getDueItems(userId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("review_items")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review", today())
    .order("next_review", { ascending: true });

  if (error) {
    console.error("getDueItems:", error.message);
    return [];
  }
  return (data ?? []) as ReviewItem[];
}

/** Adds an item to the user's review deck. Silently ignores duplicates. */
export async function addToReview(
  userId: string,
  payload: {
    item_type: "chunk" | "word";
    content: string;
    prompt: string;
    source_ref: string;
  }
): Promise<void> {
  const { error } = await supabase.from("review_items").insert({
    user_id: userId,
    item_type: payload.item_type,
    content: payload.content,
    prompt: payload.prompt,
    source_ref: payload.source_ref,
    interval_days: 1,
    ease: 2.5,
    reps: 0,
    next_review: today(),
    last_reviewed: null,
  });

  // 23505 = unique_violation — item already in deck, ignore
  if (error && error.code !== "23505") {
    console.error("addToReview:", error.message);
  }
}

/** Recalculates SM-2 fields and updates the row in the DB. */
export async function applyReview(
  itemId: string,
  current: Pick<ReviewItem, "reps" | "interval_days" | "ease">,
  quality: ReviewQuality
): Promise<void> {
  const next = calcNextReview(current, quality);
  const { error } = await supabase
    .from("review_items")
    .update({
      reps: next.reps,
      interval_days: next.interval_days,
      ease: next.ease,
      next_review: next.next_review,
      last_reviewed: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) console.error("applyReview:", error.message);
}

/** Count of items due today (for badges). */
export async function countDue(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("review_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("next_review", today());

  if (error) return 0;
  return count ?? 0;
}

/** Total items in the deck (for Progress stats). */
export async function deckSize(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("review_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
}
