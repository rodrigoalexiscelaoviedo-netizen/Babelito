import { describe, expect, it } from "vitest";
import { DIAGNOSTIC, DIAGNOSTIC_CA, DONT_KNOW, estimateLevel, levelFailed } from "../lib/diagnosticQuestions";
import type { Level } from "../lib/types";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const empty = () => Object.fromEntries(LEVELS.map((l) => [l, { correct: 0, total: 0 }])) as Record<Level, { correct: number; total: number }>;

describe("diagnostic question bank", () => {
  it("has unique ids, valid answers and 4 options", () => {
    const ids = DIAGNOSTIC.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of DIAGNOSTIC) {
      expect(q.options).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(new Set(q.options).size, `${q.id}`).toBe(4);
    }
  });

  it("covers every level with at least 5 questions and keeps each level contiguous and ordered", () => {
    for (const l of LEVELS) expect(DIAGNOSTIC.filter((q) => q.level === l).length, l).toBeGreaterThanOrEqual(5);
    const order = DIAGNOSTIC.map((q) => LEVELS.indexOf(q.level));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("the Catalan bank keeps working with the same levels", () => {
    for (const l of LEVELS) expect(DIAGNOSTIC_CA.filter((q) => q.level === l).length).toBeGreaterThan(0);
  });

  it("DONT_KNOW can never equal a valid answer index", () => {
    expect(DONT_KNOW).toBeLessThan(0);
  });
});

describe("levelFailed", () => {
  const a = (level: Level, correct: boolean) => ({ level, correct });
  it("stops when a level is not sustained (< 60 %)", () => {
    expect(levelFailed([a("A1", false), a("A1", false), a("A1", true)], "A1")).toBe(true);
    expect(levelFailed([a("A1", true), a("A1", true), a("A1", false), a("A1", true), a("A1", true)], "A1")).toBe(false);
    expect(levelFailed([a("A2", true), a("A2", true), a("A2", false), a("A2", false), a("A2", false)], "A2")).toBe(true);
  });
  it("is false for a level with no answers", () => {
    expect(levelFailed([a("A1", false)], "B2")).toBe(false);
  });
});

describe("estimateLevel with early stop", () => {
  it("places a total beginner at A1 when the first level is not sustained", () => {
    const b = empty();
    b.A1 = { correct: 1, total: 5 };
    expect(estimateLevel(b)).toBe("A1");
  });
  it("places someone who sustains A1-B1 but fails B2 at B1 (higher levels never asked)", () => {
    const b = empty();
    b.A1 = { correct: 5, total: 5 };
    b.A2 = { correct: 4, total: 5 };
    b.B1 = { correct: 3, total: 5 };
    b.B2 = { correct: 1, total: 5 };
    expect(estimateLevel(b)).toBe("B1");
  });
  it("reaches C1 only when every level is sustained", () => {
    const b = empty();
    for (const l of LEVELS) b[l] = { correct: 4, total: 5 };
    expect(estimateLevel(b)).toBe("C1");
  });
  it("blind guessing (about 25 %) never gets past A1", () => {
    const b = empty();
    for (const l of LEVELS) b[l] = { correct: 1, total: 5 };
    expect(estimateLevel(b)).toBe("A1");
  });
});
