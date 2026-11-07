import { describe, expect, it } from "vitest";
import { parseQuiz, textKey } from "../lib/readingQuiz";
import { isCompactWord, normalizePhrase, normalizeWord } from "../lib/dictionary";

const never = () => 0; // rng fijo: el barajado es determinista

describe("parseQuiz", () => {
  const good = { q: "Where does Anna work?", options: ["In a bank", "In a school", "At home"], answer: 1 };

  it("keeps the correct answer pointing at the same text after shuffling", () => {
    const [q] = parseQuiz({ questions: [good] }, never);
    expect(q.options[q.answer]).toBe("In a school");
    expect([...q.options].sort()).toEqual([...good.options].sort());
  });

  it("drops malformed questions and keeps the rest", () => {
    const out = parseQuiz(
      {
        questions: [
          good,
          { q: "", options: ["a", "b", "c"], answer: 0 },
          { q: "two options", options: ["a", "b"], answer: 0 },
          { q: "answer out of range", options: ["a", "b", "c"], answer: 5 },
          { q: "duplicate options", options: ["a", "a", "b"], answer: 0 },
        ],
      },
      never
    );
    expect(out).toHaveLength(1);
  });

  it("returns an empty list for anything that is not a quiz", () => {
    expect(parseQuiz(null)).toEqual([]);
    expect(parseQuiz({})).toEqual([]);
    expect(parseQuiz({ questions: "nope" })).toEqual([]);
  });

  it("never returns more than 3 questions", () => {
    expect(parseQuiz({ questions: [good, good, good, good, good] }, never)).toHaveLength(3);
  });
});

describe("textKey", () => {
  it("uses the id for library texts and a stable hash for pasted ones", () => {
    expect(textKey("coffee", "anything")).toBe("coffee");
    expect(textKey("custom", "hello world")).toBe(textKey("custom", "hello world"));
    expect(textKey("custom", "hello world")).not.toBe(textKey("custom", "hello there"));
  });
});

describe("dictionary normalization", () => {
  it("fills the short translation from an old cached definition", () => {
    const w = normalizeWord({ definition_es: "Salir de un lugar", definition_target: "to leave", example: "I leave at six.", phonetic: "/liːv/" });
    expect(w.translation).toBe("Salir de un lugar");
    expect(w.definition_es).toBe(w.translation);
    expect(w.uses).toEqual([]);
  });

  it("only treats rows with a translation as the new format", () => {
    expect(isCompactWord({ translation: "salir, irse" })).toBe(true);
    expect(isCompactWord({ definition_es: "Salir" })).toBe(false);
    expect(isCompactWord(null)).toBe(false);
  });

  it("keeps at most 2 well-formed uses", () => {
    const w = normalizeWord({
      translation: "salir",
      uses: [{ en: "leave out", es: "omitir" }, { en: "", es: "x" }, { en: "leave behind", es: "dejar atrás" }, { en: "leave off", es: "dejar" }],
    });
    expect(w.uses.map((u) => u.en)).toEqual(["leave out", "leave behind"]);
  });

  it("normalizes phrase explanations, including old answers without keys", () => {
    expect(normalizePhrase({ es: "Hola", grammar: "nota" })).toEqual({ es: "Hola", keys: [], grammar: "nota" });
    expect(normalizePhrase({ es: "Hola", keys: [{ en: "walk through", es: "guiar" }] }).keys).toHaveLength(1);
  });
});
