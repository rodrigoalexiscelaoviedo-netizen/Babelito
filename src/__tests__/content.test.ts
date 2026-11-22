import { describe, expect, it } from "vitest";
import { SCENARIOS, SCENARIOS_CA } from "../lib/scenarios";
import { READING_TEXTS, READING_TEXTS_CA } from "../lib/readingTexts";

describe("contenido de roleplay y lectura", () => {
  it("SCENARIOS_CA tiene escenarios de vida real catalana, sin copiar los de negocios", () => {
    expect(SCENARIOS_CA.length).toBeGreaterThanOrEqual(6);
    const enTitles = new Set(SCENARIOS.map((s) => s.title));
    for (const s of SCENARIOS_CA) expect(enTitles.has(s.title)).toBe(false);
    const levels = new Set(SCENARIOS_CA.map((s) => s.difficulty));
    expect(levels.has("A2") && levels.has("B1")).toBe(true);
  });

  it("READING_TEXTS_CA tiene textos con autor propio (sin copyright de terceros)", () => {
    expect(READING_TEXTS_CA.length).toBeGreaterThanOrEqual(6);
    for (const t of READING_TEXTS_CA) expect(t.author).toBe("Babelito");
    expect(READING_TEXTS.length).toBeGreaterThan(0);
  });
});
