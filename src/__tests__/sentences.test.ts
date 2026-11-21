import { describe, expect, it } from "vitest";
import { splitSentences } from "../lib/sentences";

describe("splitSentences", () => {
  it("parte en . ! ? y conserva el resto", () => {
    expect(splitSentences("I went out. It was cold! Did you come? Yes")).toEqual([
      "I went out.",
      "It was cold!",
      "Did you come?",
      "Yes",
    ]);
  });
  it("no parte abreviaturas comunes ni decimales", () => {
    expect(splitSentences("Dr. Smith paid 3.5 dollars. Done.")).toEqual(["Dr. Smith paid 3.5 dollars.", "Done."]);
  });
  it("texto vacío no tiene oraciones", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
});
