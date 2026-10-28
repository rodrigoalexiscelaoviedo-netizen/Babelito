import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));

import {
  SITUATIONS,
  buildQuiz,
  isComplete,
  nextStep,
  quizPercent,
  shuffle,
  sortSituations,
  stepDone,
  stepsCount,
  toScenario,
  type SituationProgress,
} from "../lib/situations";

describe("situations content", () => {
  it("has unique ids and enough material in every pack", () => {
    const ids = SITUATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(12);
    for (const s of SITUATIONS) {
      expect(s.phrases.length, s.id).toBeGreaterThanOrEqual(8);
      expect(s.words.length, s.id).toBeGreaterThanOrEqual(6);
      expect(s.quiz.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.dialogue.lines.length, s.id).toBeGreaterThanOrEqual(8);
      expect(s.dialogue.lines.some((l) => l.who === "you"), s.id).toBe(true);
      expect(s.dialogue.lines.some((l) => l.who === "other"), s.id).toBe(true);
      expect(["A1", "A2", "B1", "B2"]).toContain(s.level);
      expect(s.roleplay.opening.length, s.id).toBeGreaterThan(10);
    }
  });

  it("quiz questions have a right answer that differs from the distractors", () => {
    for (const s of SITUATIONS) {
      for (const q of s.quiz) {
        expect(new Set([q.right, ...q.wrong]).size, `${s.id}: ${q.q}`).toBe(3);
      }
    }
  });

  it("every quiz right answer appears in the phrases or dialogue of its pack", () => {
    for (const s of SITUATIONS) {
      const known = [...s.phrases.map((p) => p.en), ...s.dialogue.lines.map((l) => l.en)];
      for (const q of s.quiz) expect(known.some((k) => k.toLowerCase().includes(q.right.toLowerCase())), `${s.id}: ${q.right}`).toBe(true);
    }
  });

  it("scenario ids never collide with the fixed roleplay ones", () => {
    const ids = SITUATIONS.map(toScenario).map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(1000);
  });
});

describe("progress helpers", () => {
  it("counts and completes steps; the quiz needs 60%", () => {
    expect(stepsCount(undefined)).toBe(0);
    expect(stepDone({ quiz: 50 }, "quiz")).toBe(false);
    expect(stepDone({ quiz: 60 }, "quiz")).toBe(true);
    const all = { phrases: true, dialogue: true, quiz: 100, roleplay: true };
    expect(isComplete(all)).toBe(true);
    expect(isComplete({ ...all, roleplay: false })).toBe(false);
    expect(nextStep({ phrases: true })).toBe("dialogue");
    expect(nextStep(all)).toBeNull();
  });

  it("quizPercent rounds and guards against empty", () => {
    expect(quizPercent(3, 4)).toBe(75);
    expect(quizPercent(1, 3)).toBe(33);
    expect(quizPercent(0, 0)).toBe(0);
  });
});

describe("quiz building", () => {
  it("keeps the correct index pointing at the right answer, whatever the order", () => {
    for (let seed = 1; seed <= 20; seed++) {
      let x = seed;
      const rng = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      for (const item of buildQuiz(SITUATIONS[0].quiz, rng)) {
        const original = SITUATIONS[0].quiz.find((q) => q.q === item.q)!;
        expect(item.options[item.correctIndex]).toBe(original.right);
        expect(item.options).toHaveLength(3);
      }
    }
  });

  it("shuffle returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("sortSituations", () => {
  it("puts the user's level first and completed packs last", () => {
    const done: Record<string, SituationProgress> = {
      restaurant: { pack_id: "restaurant", steps: { phrases: true, dialogue: true, quiz: 100, roleplay: true }, completed_at: "x", updated_at: "x" },
    };
    const sorted = sortSituations(SITUATIONS, "A1", done);
    expect(sorted[sorted.length - 1].id).toBe("restaurant");
    expect(sorted[0].level).toBe("A1");
    const b2 = sortSituations(SITUATIONS, "B2", {});
    expect(b2[0].level).toBe("B2");
  });
});
