import { describe, expect, it } from "vitest";
import {
  feedbackKind,
  parsePronunciationLine,
  splitCoachReply,
  spokenPart,
} from "../lib/coachFormat";

const NEW = `That sounds like a wonderful day! Did you swim?

---FEEDBACK---
**Correction:** Yesterday I went to the beach.

**More natural:**
→ I went to the beach yesterday.

**Key tip:**
→ Usa el pasado simple para acciones terminadas.

**Pronunciation:**
→ beach /biːtʃ/ — a day at the beach
→ went /wɛnt/ — we went home`;

describe("splitCoachReply", () => {
  it("separa lo que dice el coach del feedback", () => {
    const r = splitCoachReply(NEW);
    expect(r.legacy).toBe(false);
    expect(r.talk).toBe("That sounds like a wonderful day! Did you swim?");
    expect(r.feedback.map((s) => s.title)).toEqual(["Correction", "More natural", "Key tip", "Pronunciation"]);
  });

  it("acepta contenido en la misma línea del encabezado y en líneas siguientes", () => {
    const r = splitCoachReply(NEW);
    expect(r.feedback[0].lines).toEqual(["Yesterday I went to the beach."]);
    expect(r.feedback[1].lines).toEqual(["I went to the beach yesterday."]);
    expect(r.feedback[3].lines).toHaveLength(2);
  });

  it("sin delimitador ni encabezados: todo es charla", () => {
    const r = splitCoachReply("Hi Rodri! What do you do for work?");
    expect(r).toEqual({ talk: "Hi Rodri! What do you do for work?", feedback: [], legacy: false });
  });

  it("formato antiguo (encabezados sin delimitador) se marca legacy y no se pierde nada", () => {
    const old = "Nice!\n\n**Correction:**\n→ I went.\n\nDid you swim?";
    const r = splitCoachReply(old);
    expect(r.legacy).toBe(true);
    expect(r.talk).toBe(old);
    expect(r.feedback).toEqual([]);
  });

  it("ignora secciones vacías", () => {
    const r = splitCoachReply("Hola\n---FEEDBACK---\n**Correction:**\n\n**Key tip:** Bien");
    expect(r.feedback.map((s) => s.title)).toEqual(["Key tip"]);
  });

  it("funciona con títulos en catalán", () => {
    const r = splitCoachReply("Molt bé!\n---FEEDBACK---\n**Correcció:** Vaig anar a la platja.\n**Consell:** Recorda el passat.");
    expect(r.feedback.map((s) => feedbackKind(s.title))).toEqual(["correction", "tip"]);
  });
});

describe("robustez frente a la salida real del modelo", () => {
  it("quita la etiqueta 'Part 1 — LA CONVERSA' que el modelo copió del prompt", () => {
    const r = splitCoachReply("Part 1 — LA CONVERSA\nMolt bé! Com és el teu barri?\n---FEEDBACK---\n**Correcció:** Visc a Barcelona.");
    expect(r.talk).toBe("Molt bé! Com és el teu barri?");
    expect(r.feedback).toHaveLength(1);
  });

  it("junta encabezados repetidos (varias 'Pronunciation')", () => {
    const r = splitCoachReply("Lovely!\n---FEEDBACK---\n**Pronunciation:** went /wɛnt/ — I went home\n**Pronunciation:** ate /eɪt/ — We ate lunch");
    expect(r.feedback).toHaveLength(1);
    expect(r.feedback[0].lines).toHaveLength(2);
  });
});

describe("spokenPart", () => {
  it("solo lee la charla, no el feedback", () => {
    expect(spokenPart(NEW)).toBe("That sounds like a wonderful day! Did you swim?");
  });
  it("en formato antiguo lee todo", () => {
    const old = "Nice!\n**Correction:**\n→ I went.";
    expect(spokenPart(old)).toBe(old);
  });
});

describe("parsePronunciationLine", () => {
  it("extrae palabra, IPA y frase", () => {
    expect(parsePronunciationLine("beach /biːtʃ/ — a day at the beach")).toEqual({
      word: "beach",
      ipa: "/biːtʃ/",
      phrase: "a day at the beach",
    });
  });
  it("tolera comillas y guion corto", () => {
    expect(parsePronunciationLine('"should" /ʃʊd/ - you should try')?.word).toBe("should");
  });
  it("null si no hay IPA", () => {
    expect(parsePronunciationLine("solo texto sin fonética")).toBeNull();
  });
});

describe("feedbackKind", () => {
  it("clasifica los títulos", () => {
    expect(feedbackKind("Correction")).toBe("correction");
    expect(feedbackKind("More natural")).toBe("natural");
    expect(feedbackKind("British version")).toBe("variant");
    expect(feedbackKind("Key tip")).toBe("tip");
    expect(feedbackKind("Pronunciation")).toBe("pronunciation");
    expect(feedbackKind("Otra cosa")).toBe("other");
  });
});
