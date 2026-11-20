import { describe, it, expect } from "vitest";
import { accuracyOf, estimateSkill, MIN_SKILL_ATTEMPTS } from "../lib/skillLevels";

describe("accuracyOf", () => {
  it("suma aciertos sobre el total de todos los intentos", () => {
    expect(accuracyOf([{ correct: 2, total: 3 }, { correct: 1, total: 1 }])).toBeCloseTo(3 / 4);
  });
  it("sin intentos no hay puntaje", () => {
    expect(accuracyOf([])).toBeNull();
  });
});

describe("estimateSkill", () => {
  it("con menos intentos del mínimo no muestra nivel", () => {
    const e = estimateSkill({ skill: "reading", general: "B1", diagnosed: "B1", attempts: MIN_SKILL_ATTEMPTS - 1, accuracy: 1 });
    expect(e.level).toBeNull();
    expect(e.step).toBe(0);
  });

  it("buen desempeño sostenido sube un escalón desde el nivel general", () => {
    const e = estimateSkill({ skill: "listening", general: "A2", diagnosed: "A2", attempts: 12, accuracy: 0.9 });
    expect(e.level).toBe("B1");
    expect(e.step).toBe(1);
  });

  it("desempeño bajo baja un escalón, sin pasar de diagnóstico−1", () => {
    const e = estimateSkill({ skill: "reading", general: "B1", diagnosed: "B1", attempts: 12, accuracy: 0.1 });
    expect(e.level).toBe("A2");
    expect(e.step).toBe(-1);
  });

  it("desempeño en rango esperado deja el nivel general", () => {
    const e = estimateSkill({ skill: "reading", general: "B1", diagnosed: "B1", attempts: 12, accuracy: 0.6 });
    expect(e.level).toBe("B1");
    expect(e.step).toBe(0);
  });

  it("nunca sube más de un escalón en una sola estimación", () => {
    const e = estimateSkill({ skill: "reading", general: "A1", diagnosed: "A1", attempts: 50, accuracy: 1 });
    expect(e.level).toBe("A2");
    expect(e.step).toBe(1);
  });
});
