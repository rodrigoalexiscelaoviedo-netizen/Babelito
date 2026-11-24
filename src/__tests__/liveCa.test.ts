import { describe, it, expect } from "vitest";
import { liveSystemPrompt, describeStartError } from "../lib/liveSession";
import { SITUATIONS_CA } from "../lib/situationsDataCa";

describe("IA Live en catalán", () => {
  it("el prompt libre pide hablar catalán y usar log_correction", () => {
    const p = liveSystemPrompt({ level: "B1", name: "Ana", topic: null, lang: "ca" });
    expect(p).toContain("Catalan");
    expect(p).toContain("log_correction");
    expect(p).not.toContain("English conversation partner");
  });

  it("el prompt de situación usa el rol del banco catalán", () => {
    const s = SITUATIONS_CA[0];
    const p = liveSystemPrompt({
      level: "A2",
      name: "Ana",
      topic: null,
      lang: "ca",
      situation: { title: s.title, coachRole: s.roleplay.coachRole, opening: s.roleplay.opening, description: s.roleplay.description },
    });
    expect(p).toContain(s.roleplay.opening);
  });

  it("los errores de micrófono salen en catalán", () => {
    const e = Object.assign(new Error("x"), { name: "NotFoundError" });
    expect(describeStartError(e, "ca")).toContain("micròfon");
  });
});
