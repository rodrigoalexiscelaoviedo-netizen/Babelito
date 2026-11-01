import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/claude", () => ({ askCoach: vi.fn() }));

import {
  CONFUSABLES,
  buildGapFromExample,
  buildGapFromPhrase,
  buildListen,
  buildPool,
  cardKindFor,
  type Pool,
} from "../lib/reviewCards";
import { metaKey, parseMeta } from "../lib/reviewMeta";

// RNG determinista
const seeded = (seed: number) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

const pool: Pool = buildPool([
  { item_type: "chunk", content: "Where is the nearest pharmacy?" },
  { item_type: "word", content: "umbrella" },
]);

describe("cardKindFor", () => {
  it("introduces new items, then recognises, then fills gaps, then speaks", () => {
    const chunk = { item_type: "chunk" as const, content: "How much is this?" };
    expect(cardKindFor({ ...chunk, reps: 0 }, false)).toBe("meet");
    expect(cardKindFor({ ...chunk, reps: 1 }, false)).toBe("listen");
    expect(cardKindFor({ ...chunk, reps: 2 }, false)).toBe("gap");
    expect(["gap", "say"]).toContain(cardKindFor({ ...chunk, reps: 5 }, false, seeded(3)));
  });

  it("never asks a gap for a very short phrase or a word without an example", () => {
    expect(cardKindFor({ item_type: "chunk", content: "Good morning", reps: 2 }, false)).toBe("listen");
    expect(cardKindFor({ item_type: "word", content: "umbrella", reps: 2 }, false)).toBe("listen");
    expect(cardKindFor({ item_type: "word", content: "umbrella", reps: 2 }, true)).toBe("gap");
  });
});

describe("buildListen", () => {
  it("returns three distinct options with the right one at correctIndex", () => {
    for (let s = 1; s < 25; s++) {
      const c = buildListen({ item_type: "chunk", content: "How much is this?" }, pool, seeded(s));
      expect(c.options).toHaveLength(3);
      expect(new Set(c.options).size).toBe(3);
      expect(c.options[c.correctIndex]).toBe("How much is this?");
    }
  });

  it("uses words as distractors for words", () => {
    const c = buildListen({ item_type: "word", content: "umbrella" }, pool, seeded(2));
    expect(c.options.every((o) => !o.includes(" "))).toBe(true);
  });
});

describe("buildGapFromPhrase", () => {
  it("blanks a confusable word with options from the same group", () => {
    let found = 0;
    for (let s = 1; s < 40; s++) {
      const g = buildGapFromPhrase("I'd like to sit on the terrace", pool, seeded(s));
      expect(g).not.toBeNull();
      expect(g!.options).toHaveLength(3);
      expect(g!.options[g!.correctIndex]).toBe(g!.answer);
      const rebuilt = `${g!.before}${g!.answer}${g!.after}`.replace(/\s+/g, " ").trim();
      expect(rebuilt).toBe("I'd like to sit on the terrace");
      if (CONFUSABLES.some((grp) => grp.includes(g!.answer.toLowerCase()))) found++;
    }
    expect(found).toBeGreaterThan(10);
  });

  it("keeps punctuation and capitalisation", () => {
    const g = buildGapFromPhrase("Where is the station?", pool, seeded(5))!;
    const rebuilt = `${g.before}${g.answer}${g.after}`.replace(/\s+/g, " ").trim();
    expect(rebuilt).toBe("Where is the station?");
    expect(g.options.every((o) => o.length > 0)).toBe(true);
  });

  it("returns null for phrases that are too short", () => {
    expect(buildGapFromPhrase("Thank you", pool)).toBeNull();
  });
});

describe("buildGapFromExample", () => {
  it("blanks the word in its example sentence", () => {
    const g = buildGapFromExample("umbrella", "Take an umbrella, it might rain.", pool, seeded(4))!;
    expect(g.before).toBe("Take an ");
    expect(g.after).toBe(", it might rain.");
    expect(g.options[g.correctIndex]).toBe("umbrella");
    expect(g.options).toHaveLength(3);
  });

  it("returns null when the example does not contain the word", () => {
    expect(buildGapFromExample("umbrella", "It is raining.", pool)).toBeNull();
  });
});

describe("parseMeta", () => {
  const wanted = ["Could I have the bill, please?", "umbrella"];
  it("keeps valid entries and drops examples that do not contain the item", () => {
    const raw = JSON.stringify({
      items: [
        { content: "Could I have the bill, please?", definition: "You ask to pay in a restaurant.", example: "Excuse me, could I have the bill, please?" },
        { content: "umbrella", definition: "You use it when it rains.", example: "It is raining outside." },
        { content: "unknown thing", definition: "x", example: "x" },
      ],
    });
    const m = parseMeta(raw, wanted);
    expect(Object.keys(m).sort()).toEqual([metaKey("Could I have the bill, please?"), "umbrella"].sort());
    expect(m["umbrella"].example).toBe("");
    expect(m["umbrella"].definition).toContain("rains");
  });

  it("returns an empty object for garbage", () => {
    expect(parseMeta("nope", wanted)).toEqual({});
  });
});
