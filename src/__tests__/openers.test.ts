import { describe, expect, it } from "vitest";
import { openingLine, isBeginner } from "../lib/conversationOpeners";
import { allTopics } from "../lib/topics";

describe("openingLine", () => {
  it("saluda por el primer nombre y hace UNA pregunta", () => {
    const t = openingLine({ lang: "en", name: "Rodri Cela", topic: "Your work", level: "B1" });
    expect(t.startsWith("Hi Rodri!")).toBe(true);
    expect((t.match(/\?/g) ?? []).length).toBe(1);
  });

  it("usa una pregunta más simple para A1–A2 que para B1+", () => {
    const simple = openingLine({ lang: "en", name: "Ana", topic: "Your weekend", level: "A1" });
    const rich = openingLine({ lang: "en", name: "Ana", topic: "Your weekend", level: "B2" });
    expect(simple.length).toBeLessThan(rich.length);
  });

  it("sin nivel se trata como principiante", () => {
    expect(isBeginner(null)).toBe(true);
    expect(isBeginner("C1")).toBe(false);
  });

  it("funciona en catalán", () => {
    const t = openingLine({ lang: "ca", name: "Nadia", topic: "El teu barri", level: "A2" });
    expect(t.startsWith("Hola, Nadia!")).toBe(true);
    expect(t).toContain("barri");
  });

  it("un tema escrito a mano no inventa preguntas: lo nombra", () => {
    const t = openingLine({ lang: "en", name: "Ana", topic: "Quantum cooking", level: "B1" });
    expect(t).toContain("Quantum cooking");
  });

  it("sin tema es charla libre", () => {
    expect(openingLine({ lang: "en", name: "Ana", topic: null, level: "A1" })).toContain("How are you today?");
    expect(openingLine({ lang: "ca", name: "Nadia", topic: null, level: "A1" })).toContain("Com estàs avui?");
  });

  it("NINGÚN tema de la app queda sin pregunta específica (en y ca)", () => {
    for (const topic of allTopics("en")) {
      const t = openingLine({ lang: "en", name: "X", topic, level: "A1" });
      expect(t, topic).not.toContain("Let's talk about:");
    }
    for (const topic of allTopics("ca")) {
      const t = openingLine({ lang: "ca", name: "X", topic, level: "A1" });
      expect(t, topic).not.toContain("Parlem de:");
    }
  });
});
