import { describe, it, expect } from "vitest";
import { SITUATIONS_CA, getSituationCa } from "../lib/situationsDataCa";
import { SITUATIONS } from "../lib/situationsData";

describe("Situaciones en catalán: contenido", () => {
  it("tiene las mismas situaciones (ids) que la versión en inglés", () => {
    expect(SITUATIONS_CA.map((s) => s.id).sort()).toEqual(SITUATIONS.map((s) => s.id).sort());
  });

  it("cada situación tiene frases, vocabulario, diálogo, roleplay y 4 preguntas de quiz", () => {
    for (const s of SITUATIONS_CA) {
      expect(s.phrases.length, s.id).toBeGreaterThanOrEqual(6);
      expect(s.words.length, s.id).toBeGreaterThan(0);
      expect(s.dialogue.lines.length, s.id).toBeGreaterThan(0);
      expect(s.quiz, s.id).toHaveLength(4);
      expect(s.roleplay.opening, s.id).toBeTruthy();
    }
  });

  it("la respuesta correcta de cada pregunta no aparece entre las incorrectas", () => {
    for (const s of SITUATIONS_CA) {
      for (const q of s.quiz) {
        expect(q.wrong, `${s.id}: ${q.q}`).not.toContain(q.right);
      }
    }
  });

  it("se encuentra una situación por id", () => {
    expect(getSituationCa("job-interview")?.title).toBeTruthy();
    expect(getSituationCa("no-existe")).toBeUndefined();
  });
});
