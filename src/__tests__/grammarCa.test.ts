import { describe, it, expect } from "vitest";
import { GRAMMAR_LESSONS_CA, lessonsForErrorCa, getLessonCa } from "../lib/grammarLessonsCa";
import { ERROR_TYPES, ERROR_TYPES_CA } from "../lib/errorTypes";

describe("Gramática en catalán: contenido", () => {
  it("cada lección tiene id único, reglas, errores y un cuestionario de 4 preguntas", () => {
    const ids = GRAMMAR_LESSONS_CA.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of GRAMMAR_LESSONS_CA) {
      expect(l.rules.length).toBeGreaterThan(0);
      expect(l.mistakes.length).toBeGreaterThan(0);
      expect(l.quiz).toHaveLength(4);
    }
  });

  it("la respuesta correcta no aparece entre las incorrectas", () => {
    for (const l of GRAMMAR_LESSONS_CA) {
      for (const q of l.quiz) {
        expect(q.wrong).not.toContain(q.right);
      }
    }
  });

  it("las claves de error de cada lección existen en el catálogo catalán", () => {
    for (const l of GRAMMAR_LESSONS_CA) {
      for (const key of l.errorTypes) {
        expect(ERROR_TYPES_CA[key], `${l.id} → ${key}`).toBeDefined();
      }
    }
  });

  it("el catálogo catalán cubre las mismas claves que el inglés", () => {
    expect(Object.keys(ERROR_TYPES_CA).sort()).toEqual(Object.keys(ERROR_TYPES).sort());
  });

  it("se puede buscar una lección por id y por tipo de error", () => {
    expect(getLessonCa("ca-articles")?.title).toBeTruthy();
    expect(lessonsForErrorCa("article").length).toBeGreaterThan(0);
  });
});
