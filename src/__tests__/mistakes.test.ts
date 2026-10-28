import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/claude", () => ({ askCoach: vi.fn() }));
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));

import { GRAMMAR_LESSONS, lessonsForError } from "../lib/grammarLessons";
import { ERROR_TYPES } from "../lib/errorTypes";
import { parseDrill, summarizeErrors, trendOf, type ErrorRow } from "../lib/mistakes";

const NOW = new Date("2026-10-28T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("grammar lessons content", () => {
  it("has unique ids and complete material", () => {
    const ids = GRAMMAR_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of GRAMMAR_LESSONS) {
      expect(l.rules.length, l.id).toBeGreaterThanOrEqual(1);
      expect(l.mistakes.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.quiz.length, l.id).toBeGreaterThanOrEqual(4);
      for (const q of l.quiz) expect(new Set([q.right, ...q.wrong]).size, `${l.id}: ${q.q}`).toBe(3);
      for (const e of l.errorTypes) expect(ERROR_TYPES[e], `${l.id} -> ${e}`).toBeDefined();
    }
  });

  it("every grammar error type the coach reports has at least one lesson", () => {
    for (const key of Object.keys(ERROR_TYPES)) {
      if (key === "other") continue;
      expect(lessonsForError(key).length, key).toBeGreaterThan(0);
    }
  });
});

describe("trendOf", () => {
  it("classifies the change versus the previous month", () => {
    expect(trendOf(3, 0)).toBe("new");
    expect(trendOf(2, 5)).toBe("down");
    expect(trendOf(8, 5)).toBe("up");
    expect(trendOf(5, 5)).toBe("same");
  });
});

describe("summarizeErrors", () => {
  const rows: ErrorRow[] = [
    { error_type: "verb_tense", original_text: "I go yesterday", correction: "I went yesterday", created_at: daysAgo(2) },
    { error_type: "verb_tense", original_text: "We eated", correction: "We ate", created_at: daysAgo(5) },
    { error_type: "verb_tense", original_text: "old", correction: "old fixed", created_at: daysAgo(40) },
    { error_type: "article", original_text: "She is teacher", correction: "She is a teacher", created_at: daysAgo(3) },
    { error_type: "other", original_text: "x", correction: "y", created_at: daysAgo(1) },
    { error_type: "pronunciation_error", original_text: "Beach", created_at: daysAgo(1) } as ErrorRow,
    { error_type: "pronunciation_error", original_text: "beach", created_at: daysAgo(2) } as ErrorRow,
    { error_type: "word_order", original_text: "ancient", correction: "ancient", created_at: daysAgo(90) },
  ];

  it("ranks types by count in the last 30 days and compares with the month before", () => {
    const s = summarizeErrors(rows, NOW);
    expect(s.total).toBe(3);
    expect(s.stats.map((x) => x.type)).toEqual(["verb_tense", "article"]);
    expect(s.stats[0]).toMatchObject({ count: 2, previous: 1, trend: "up" });
    expect(s.stats[1]).toMatchObject({ count: 1, previous: 0, trend: "new" });
  });

  it("keeps recent examples and ignores other/pronunciation/older-than-60-days", () => {
    const s = summarizeErrors(rows, NOW);
    expect(s.stats[0].examples).toHaveLength(2);
    expect(s.stats.find((x) => x.type === "other")).toBeUndefined();
    expect(s.stats.find((x) => x.type === "word_order")).toBeUndefined();
  });

  it("collects pronunciation words once, lowercased", () => {
    expect(summarizeErrors(rows, NOW).pronunciationWords).toEqual(["beach"]);
  });

  it("handles no data", () => {
    expect(summarizeErrors([], NOW)).toEqual({ total: 0, stats: [], pronunciationWords: [] });
  });
});

describe("parseDrill", () => {
  const good = JSON.stringify({
    items: [
      { q: "Yesterday I ___ to the cinema.", options: ["went", "go", "goed"], answer: 0, why: "Pasado de go." },
      { q: "She ___ a doctor.", options: ["is", "are", "be"], answer: 0 },
    ],
  });

  it("keeps the right answer pointing at the correct option after shuffling", () => {
    for (let seed = 1; seed < 15; seed++) {
      let x = seed;
      const rng = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      const items = parseDrill(good, rng);
      expect(items).toHaveLength(2);
      expect(items[0].options[items[0].correctIndex]).toBe("went");
      expect(items[1].options[items[1].correctIndex]).toBe("is");
    }
  });

  it("accepts fenced JSON and drops malformed items", () => {
    const messy = "```json\n" + JSON.stringify({
      items: [
        { q: "No gap here", options: ["a", "b", "c"], answer: 0 },
        { q: "Two ___ options", options: ["a", "b"], answer: 0 },
        { q: "Bad answer ___", options: ["a", "b", "c"], answer: 7 },
        { q: "Dup ___", options: ["a", "A", "c"], answer: 0 },
        { q: "Fine ___", options: ["a", "b", "c"], answer: 2 },
      ],
    }) + "\n```";
    const items = parseDrill(messy);
    expect(items).toHaveLength(1);
    expect(items[0].q).toBe("Fine ___");
  });

  it("returns an empty list for garbage", () => {
    expect(parseDrill("not json at all")).toEqual([]);
  });
});
