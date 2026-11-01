import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/claude", () => ({ askCoach: vi.fn() }));

import { combineLevels, readingAccuracy, READING_SENTENCES } from "../lib/oralDiagnostic";

describe("readingAccuracy", () => {
  const perfect = READING_SENTENCES.map((s) => s.text);

  it("is 1 for a perfect reading and ignores case/punctuation", () => {
    expect(readingAccuracy(READING_SENTENCES, perfect)).toBe(1);
    expect(readingAccuracy(READING_SENTENCES, perfect.map((t) => t.toLowerCase().replace(/[.,:]/g, "")))).toBe(1);
  });

  it("barely drops when one word is missing in one sentence", () => {
    const t = [...perfect];
    t[2] = t[2].replace(/\s\w+\.$/, ".");
    const acc = readingAccuracy(READING_SENTENCES, t)!;
    expect(acc).toBeGreaterThan(0.9);
    expect(acc).toBeLessThan(1);
  });

  it("is null when nothing was read and low for unrelated text", () => {
    expect(readingAccuracy(READING_SENTENCES, ["", "", "", "", ""])).toBeNull();
    expect(readingAccuracy(READING_SENTENCES, ["hello", "hello", "hello", "hello", "hello"])!).toBeLessThan(0.2);
  });
});

describe("combineLevels", () => {
  it("one slightly imperfect reading no longer drags a B1 learner down", () => {
    const r = combineLevels("B1", 0.95, "B1");
    expect(r.final).toBe("B1");
    expect(r.reading).toBe("B1");
  });

  it("a very imprecise reading lowers the result by one step, never more", () => {
    expect(combineLevels("B1", 0.2, "B1").final).toBe("A2");
    expect(combineLevels("B1", 0.2, "A1").final).toBe("A2");
    expect(combineLevels("A1", 0.1, "A1").final).toBe("A1");
  });

  it("fluent speaking can lift the written level by one step at most", () => {
    expect(combineLevels("B1", 0.95, "B2").final).toBe("B2");
    expect(combineLevels("B1", 0.95, "C1").final).toBe("B2");
    expect(combineLevels("B1", 0.95, "C2").final).toBe("B2");
  });

  it("combined adjustments are capped at one step", () => {
    expect(combineLevels("B1", 0.1, "A1").final).toBe("A2");
    expect(combineLevels("B1", 0.1, "B2").final).toBe("B1");
  });

  it("works when a part is missing", () => {
    expect(combineLevels("B2", null, null).final).toBe("B2");
    expect(combineLevels("B2", null, "B2").final).toBe("B2");
    expect(combineLevels("B2", 0.9, null).final).toBe("B2");
  });
});
