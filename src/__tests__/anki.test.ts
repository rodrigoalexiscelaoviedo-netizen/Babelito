import { describe, expect, it } from "vitest";
import { buildAnkiText, escapeField } from "../lib/anki";

describe("escapeField", () => {
  it("quita tabs y convierte saltos de línea en <br>", () => {
    expect(escapeField("a\tb\nc")).toBe("a b<br>c");
  });
});

describe("buildAnkiText", () => {
  it("incluye cabecera de Anki con separador tab y tipo de nota", () => {
    const text = buildAnkiText([{ front: "Bon dia", back: "Buenos días" }], { deck: "Babelito Català" });
    const lines = text.split("\n");
    expect(lines[0]).toBe("#separator:tab");
    expect(lines).toContain("#notetype:Basic (and reversed card)");
    expect(lines).toContain("#deck:Babelito Català");
    expect(lines).toContain("#tags column:3");
  });

  it("una fila por tarjeta, con front, back y tags separados por tab", () => {
    const text = buildAnkiText([{ front: "Ho aconseguirem", back: "Lo conseguiremos", tags: "babelito ca chunk" }]);
    const lines = text.trimEnd().split("\n");
    expect(lines[lines.length - 1]).toBe("Ho aconseguirem\tLo conseguiremos\tbabelito ca chunk");
  });

  it("descarta tarjetas vacías", () => {
    const text = buildAnkiText([{ front: "", back: "x" }, { front: "y", back: "  " }, { front: "ok", back: "bien" }]);
    const dataLines = text.trimEnd().split("\n").filter((l) => !l.startsWith("#"));
    expect(dataLines).toHaveLength(1);
  });

  it("conserva acentos catalanes y ñ sin alterarlos", () => {
    const text = buildAnkiText([{ front: "Què tal? Ça va. Señor", back: "¿Qué tal?" }]);
    expect(text).toContain("Què tal? Ça va. Señor");
  });
});
