import { describe, it, expect } from "vitest";
import { comparePhrases } from "../lib/pronunciation";
import { normalizeLiveReport } from "../lib/geminiTools";
import { parseServerMessage, normalizeCorrection, buildSetupMessage } from "../lib/liveSession";

describe("comparePhrases (alineación)", () => {
  it("marca solo la palabra omitida, no todas las siguientes", () => {
    const r = comparePhrases("I went to the market", "Yesterday I went to the market");
    expect(r.incorrect).toEqual(["Yesterday"]);
  });

  it("una palabra de más en lo dicho no arruina el resto", () => {
    const r = comparePhrases("so um I went home", "I went home");
    expect(r.incorrect).toEqual([]);
  });

  it("sin nada dicho, todas quedan incorrectas", () => {
    const r = comparePhrases("", "Good morning");
    expect(r.incorrect).toEqual(["Good", "morning"]);
  });
});

describe("normalizeLiveReport", () => {
  it("descarta campos mal formados y limita las listas", () => {
    const r = normalizeLiveReport({
      overall: "Buen ritmo.",
      strengths: ["a", "b", "c", "d"],
      priorities: [{ issue: "Past tense", youSaid: "I have went", better: "I went", why: "Use past for finished actions" }, { issue: "" }],
      vocabulary: [{ en: "rent", es: "alquilar" }, { en: "" }],
      nextSteps: "no es lista",
    });
    expect(r?.strengths).toHaveLength(3);
    expect(r?.priorities).toHaveLength(1);
    expect(r?.vocabulary).toEqual([{ en: "rent", es: "alquilar" }]);
    expect(r?.nextSteps).toEqual([]);
  });

  it("devuelve null si no hay nada útil", () => {
    expect(normalizeLiveReport({})).toBeNull();
    expect(normalizeLiveReport(null)).toBeNull();
  });
});

describe("llamadas de herramienta en vivo", () => {
  it("parsea toolCall con log_correction", () => {
    const events = parseServerMessage({
      toolCall: { functionCalls: [{ id: "1", name: "log_correction", args: { original: "I have went", correction: "I went", explanation: "Past simple" } }] },
    });
    expect(events[0].type).toBe("toolCall");
    if (events[0].type === "toolCall") {
      expect(normalizeCorrection(events[0].calls[0].args)).toEqual({ original: "I have went", correction: "I went", explanation: "Past simple" });
    }
  });

  it("el setup declara la herramienta de correcciones", () => {
    const msg = buildSetupMessage("gemini-x", "prompt") as { setup: { tools: Array<{ functionDeclarations: Array<{ name: string }> }> } };
    expect(msg.setup.tools[0].functionDeclarations[0].name).toBe("log_correction");
  });
});
