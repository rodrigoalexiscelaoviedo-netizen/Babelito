import { describe, expect, it } from "vitest";
import { DIAGNOSTIC, DIAGNOSTIC_CA, diagnosticFor, estimateLevel } from "../lib/diagnosticQuestions";
import { readingSentencesFor, READING_SENTENCES, READING_SENTENCES_CA } from "../lib/oralDiagnostic";
import { SCENARIOS, SCENARIOS_CA } from "../lib/scenarios";
import { READING_TEXTS, READING_TEXTS_CA } from "../lib/readingTexts";
import type { Level } from "../lib/types";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

describe("banco de diagnóstico", () => {
  for (const [name, bank] of [["en", DIAGNOSTIC], ["ca", DIAGNOSTIC_CA]] as const) {
    it(`${name}: 16 preguntas con 4 opciones y respuesta válida`, () => {
      expect(bank).toHaveLength(16);
      for (const q of bank) {
        expect(q.options).toHaveLength(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    });

    it(`${name}: cubre todos los niveles A1–C1`, () => {
      const present = new Set(bank.map((q) => q.level));
      for (const lvl of LEVELS) expect(present.has(lvl)).toBe(true);
    });
  }

  it("diagnosticFor selecciona el banco según el idioma", () => {
    expect(diagnosticFor("ca")).toBe(DIAGNOSTIC_CA);
    expect(diagnosticFor("en")).toBe(DIAGNOSTIC);
  });
});

describe("estimateLevel", () => {
  it("sube hasta el primer escalón que no se sostiene (>=60%)", () => {
    const perfectA1A2 = {
      A1: { correct: 3, total: 3 },
      A2: { correct: 3, total: 3 },
      B1: { correct: 1, total: 3 },
      B2: { correct: 0, total: 3 },
      C1: { correct: 0, total: 3 },
    };
    expect(estimateLevel(perfectA1A2)).toBe("A2");
  });
});

describe("contenido de lectura y roleplay", () => {
  it("cada idioma tiene frases de lectura propias", () => {
    expect(readingSentencesFor("ca")).toBe(READING_SENTENCES_CA);
    expect(readingSentencesFor("en")).toBe(READING_SENTENCES);
    expect(READING_SENTENCES_CA).toHaveLength(5);
  });

  it("las frases catalanas no contienen palabras típicas del inglés", () => {
    const englishMarkers = /\b(the|and|with|this|that|which)\b/i;
    for (const s of READING_SENTENCES_CA) expect(s.text).not.toMatch(englishMarkers);
  });

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
