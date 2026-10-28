import { describe, expect, it, vi } from "vitest";

// sessionReport importa supabaseClient (que exige variables de entorno). Se reemplaza por un stub.
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/claude", () => ({ askCoach: vi.fn() }));

import { reportSystem, transcriptText } from "../lib/sessionReport";

describe("reportSystem", () => {
  it("en inglés habla directamente a la persona y no inventa", () => {
    const p = reportSystem("en", "A1", "conversation");
    expect(p).toMatch(/speak DIRECTLY TO THE LEARNER/);
    expect(p).toMatch(/never invent/i);
    expect(p).toMatch(/very simple words/);
  });

  it("en catalán el prompt está en catalán (antes salía en inglés)", () => {
    const p = reportSystem("ca", "A2", "conversation");
    expect(p).toMatch(/Ets Babelito/);
    expect(p).toMatch(/CATALÀ/);
    expect(p).not.toMatch(/English/);
  });

  it("distingue roleplay de conversación", () => {
    expect(reportSystem("en", "B1", "roleplay")).toMatch(/role-play/);
    expect(reportSystem("en", "B1", "conversation")).toMatch(/free conversation/);
  });

  it("un nivel B1+ no usa el estilo de principiante", () => {
    expect(reportSystem("en", "B2", "conversation")).not.toMatch(/very simple words/);
  });
});

describe("transcriptText", () => {
  it("separa la charla del coach de su feedback", () => {
    const t = transcriptText([
      { role: "assistant", content: "Hi! What did you do?" },
      { role: "user", content: "I go to beach" },
      { role: "assistant", content: "Nice! Did you swim?\n---FEEDBACK---\n**Correction:** I went to the beach." },
    ]);
    expect(t).toContain("Coach: Hi! What did you do?");
    expect(t).toContain("Learner: I go to beach");
    expect(t).toContain("[Coach feedback on the learner's previous message — Correction: I went to the beach.]");
  });

  it("mensajes antiguos (sin delimitador) pasan enteros", () => {
    const t = transcriptText([{ role: "assistant", content: "Nice!\n**Correction:**\n→ I went." }]);
    expect(t).toContain("Nice!");
  });
});
