import { describe, expect, it } from "vitest";
import {
  combinedScore,
  conversationScore,
  decideLevel,
  diagnosticScore,
  reviewScore,
  THRESHOLDS,
} from "../lib/leveling";

describe("componentes de puntaje", () => {
  it("repaso: ease 2.5 es 1.0 y 1.3 es 0.0", () => {
    expect(reviewScore(2.5)).toBeCloseTo(1);
    expect(reviewScore(1.3)).toBeCloseTo(0);
    expect(reviewScore(null)).toBeNull();
  });

  it("conversación: 0 errores es 1.0, 6 por sesión es 0.0", () => {
    expect(conversationScore(0, 4)).toBeCloseTo(1);
    expect(conversationScore(24, 4)).toBeCloseTo(0);
    expect(conversationScore(5, 0)).toBeNull();
  });

  it("diagnóstico: premia estar en el nivel diagnosticado o encima", () => {
    expect(diagnosticScore("B1", "B1")).toBe(1);
    expect(diagnosticScore("B2", "B1")).toBe(1);
    expect(diagnosticScore("A2", "B1")).toBe(0.5);
    expect(diagnosticScore("A1", "B1")).toBe(0);
    expect(diagnosticScore("B1", null)).toBeNull();
  });

  it("promedio ponderado renormaliza si falta un componente", () => {
    // Solo repaso (peso 0.6) y conversación (0.3), sin diagnóstico.
    const s = combinedScore({ review: 1, conversation: 0, diagnostic: null });
    expect(s).toBeCloseTo(0.6 / 0.9);
    expect(combinedScore({ review: null, conversation: null, diagnostic: null })).toBeNull();
  });
});

describe("decideLevel", () => {
  const strong = { review: 1, conversation: 1, diagnostic: 1 };
  const weak = { review: 0, conversation: 0, diagnostic: 0 };

  it("no mueve el nivel con pocas sesiones", () => {
    const d = decideLevel({ current: "B1", diagnosed: "B1", sessions7d: 2, parts: strong });
    expect(d.changed).toBe(false);
    expect(d.level).toBe("B1");
  });

  it("sube un solo escalón con buen desempeño sostenido", () => {
    const d = decideLevel({ current: "B1", diagnosed: "B1", sessions7d: 5, parts: strong });
    expect(d.level).toBe("B2");
    expect(d.changed).toBe(true);
  });

  it("nunca sube más de diagnóstico + 2", () => {
    const d = decideLevel({ current: "B2", diagnosed: "A2", sessions7d: 5, parts: strong });
    expect(d.level).toBe("B2");
    expect(d.changed).toBe(false);
  });

  it("baja un escalón, sin bajar de diagnóstico − 1", () => {
    const down = decideLevel({ current: "B2", diagnosed: "B2", sessions7d: 5, parts: weak });
    expect(down.level).toBe("B1");
    const floor = decideLevel({ current: "B1", diagnosed: "B2", sessions7d: 5, parts: weak });
    expect(floor.level).toBe("B1");
    expect(floor.changed).toBe(false);
  });

  it("zona intermedia no cambia nada", () => {
    const mid = (THRESHOLDS.up + THRESHOLDS.down) / 2;
    const d = decideLevel({
      current: "B1",
      diagnosed: "B1",
      sessions7d: 5,
      parts: { review: mid, conversation: mid, diagnostic: mid },
    });
    expect(d.changed).toBe(false);
  });

  it("no se sale de A1 ni de C1", () => {
    expect(decideLevel({ current: "A1", diagnosed: "A1", sessions7d: 5, parts: weak }).level).toBe("A1");
    expect(decideLevel({ current: "C1", diagnosed: "C1", sessions7d: 5, parts: strong }).level).toBe("C1");
  });
});
