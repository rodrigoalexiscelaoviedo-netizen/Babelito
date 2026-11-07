import { describe, expect, it } from "vitest";
import { ALL_TIEBREAKERS, DIAGNOSTIC, DONT_KNOW, needsTiebreak, tiebreakersFor, withTiebreakers } from "../lib/diagnosticQuestions";
import type { Level } from "../lib/types";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const ans = (level: Level, correct: boolean, chosen = 0) => ({ level, correct, chosen });

describe("tiebreak bank", () => {
  it("has 3 valid questions per level with ids that do not clash with the main bank", () => {
    const mainIds = new Set(DIAGNOSTIC.map((q) => q.id));
    for (const l of LEVELS) expect(tiebreakersFor("en", l)).toHaveLength(3);
    const ids = ALL_TIEBREAKERS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of ALL_TIEBREAKERS) {
      expect(mainIds.has(q.id), `${q.id}`).toBe(false);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size, `${q.id}`).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });

  it("has no Catalan tiebreakers yet", () => {
    expect(tiebreakersFor("ca", "B1")).toEqual([]);
  });
});

describe("needsTiebreak", () => {
  const two = [ans("B1", true), ans("B1", true), ans("B1", false), ans("B1", false), ans("B1", false)];

  it("fires only on exactly 2 of 5, once per level", () => {
    expect(needsTiebreak(two, "B1", false)).toBe(true);
    expect(needsTiebreak(two, "B1", true)).toBe(false);
  });

  it("does not fire for clear passes or clear failures", () => {
    const three = [ans("B1", true), ans("B1", true), ans("B1", true), ans("B1", false), ans("B1", false)];
    const one = [ans("B1", true), ans("B1", false), ans("B1", false), ans("B1", false), ans("B1", false)];
    expect(needsTiebreak(three, "B1", false)).toBe(false);
    expect(needsTiebreak(one, "B1", false)).toBe(false);
  });

  it("does not fire when the person answered 'I don't know' three times or more", () => {
    const unsure = [ans("A1", true), ans("A1", true), ans("A1", false, DONT_KNOW), ans("A1", false, DONT_KNOW), ans("A1", false, DONT_KNOW)];
    expect(needsTiebreak(unsure, "A1", false)).toBe(false);
  });

  it("only looks at the level being closed", () => {
    expect(needsTiebreak(two, "A2", false)).toBe(false);
  });
});

describe("withTiebreakers", () => {
  it("puts the extra questions right after the last question of their level", () => {
    const out = withTiebreakers(DIAGNOSTIC, tiebreakersFor("en", "B1"));
    expect(out).toHaveLength(DIAGNOSTIC.length + 3);
    const levels = out.map((q) => q.level);
    const order = levels.map((l) => LEVELS.indexOf(l));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const firstExtra = out.findIndex((q) => q.id === 107);
    expect(out[firstExtra - 1].level).toBe("B1");
    expect(out[firstExtra + 3].level).toBe("B2");
  });

  it("returns the base list untouched when there is nothing to add", () => {
    expect(withTiebreakers(DIAGNOSTIC, [])).toBe(DIAGNOSTIC);
  });
});
