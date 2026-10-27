import { describe, expect, it } from "vitest";

import { sectionText } from "../lib/correctionText";

const sample = `**Correction:**
→ Hi John, I am writing to confirm tomorrow's meeting.

**More natural:**
→ Just writing to confirm our meeting tomorrow.

**Key tips:**
Use "writing to confirm".`;

describe("sectionText", () => {
  it("extrae la versión corregida", () => {
    expect(sectionText(sample, /correct/i)).toBe("Hi John, I am writing to confirm tomorrow's meeting.");
  });
  it("extrae la versión natural", () => {
    expect(sectionText(sample, /natural/i)).toBe("Just writing to confirm our meeting tomorrow.");
  });
  it("devuelve null si la sección no existe", () => {
    expect(sectionText(sample, /british/i)).toBeNull();
  });
});
