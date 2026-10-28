import { describe, expect, it } from "vitest";
import { diffWords, normaliseWords, pickSentences } from "../lib/dictation";

describe("normaliseWords", () => {
  it("lowercases, strips punctuation and keeps apostrophes", () => {
    expect(normaliseWords("Hello, World! I'm here.")).toEqual(["hello", "world", "i'm", "here"]);
    expect(normaliseWords("It’s fine")).toEqual(["it's", "fine"]);
  });
});

describe("diffWords", () => {
  it("scores a perfect answer ignoring case and punctuation", () => {
    const r = diffWords("Can I try this on?", "can i try this on");
    expect(r.accuracy).toBe(100);
    expect(r.tokens.every((t) => t.ok)).toBe(true);
    expect(r.extra).toEqual([]);
  });

  it("does not punish every word after a missing one", () => {
    const r = diffWords("Where are the fitting rooms?", "Where the fitting rooms");
    expect(r.tokens.map((t) => t.ok)).toEqual([true, false, true, true, true]);
    expect(r.accuracy).toBe(80);
  });

  it("reports wrong and extra words", () => {
    const r = diffWords("I'd like to return this.", "I would like to return this please");
    expect(r.tokens[0].ok).toBe(false);
    expect(r.extra).toContain("would");
    expect(r.extra).toContain("please");
  });

  it("handles empty input", () => {
    expect(diffWords("Hello there", "").accuracy).toBe(0);
    expect(diffWords("", "anything").accuracy).toBe(0);
  });
});

describe("pickSentences", () => {
  it("returns the requested number of unique, reasonably short sentences", () => {
    const s = pickSentences("A2", 6);
    expect(s).toHaveLength(6);
    expect(new Set(s).size).toBe(6);
    for (const x of s) expect(x.split(/\s+/).length).toBeLessThanOrEqual(14);
  });

  it("stays near the level: A1 users do not get B2 work meetings", () => {
    const s = pickSentences("A1", 200);
    expect(s.some((x) => x.includes("circle back"))).toBe(false);
  });
});
