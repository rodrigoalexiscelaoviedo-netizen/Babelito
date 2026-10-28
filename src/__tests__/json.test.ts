import { describe, expect, it } from "vitest";
import { parseAiJson, tryParseAiJson } from "../lib/json";

describe("parseAiJson", () => {
  it("lee JSON limpio", () => {
    expect(parseAiJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignora bloques de código y texto alrededor", () => {
    const raw = 'Claro:\n```json\n{"title":"Hola","n":2}\n```\nEspero que sirva.';
    expect(parseAiJson<{ title: string; n: number }>(raw)).toEqual({ title: "Hola", n: 2 });
  });

  it("repara comas finales", () => {
    expect(parseAiJson<{ list: number[] }>('{"list":[1,2,3,],}')).toEqual({ list: [1, 2, 3] });
  });

  it("no se confunde con llaves dentro de strings", () => {
    const raw = '{"text":"usa {llaves} y \\"comillas\\"","ok":true} texto extra { sobrante';
    expect(parseAiJson<{ text: string; ok: boolean }>(raw)).toEqual({ text: 'usa {llaves} y "comillas"', ok: true });
  });

  it("toma solo el primer objeto si hay varios", () => {
    expect(parseAiJson<{ a: number }>('{"a":1} {"a":2}')).toEqual({ a: 1 });
  });

  it("falla con mensaje claro si está truncado", () => {
    expect(() => parseAiJson('{"title":"Cortado","content":"empieza y no ter')).toThrow(/JSON completo/);
  });

  it("falla si no hay JSON", () => {
    expect(() => parseAiJson("Lo siento, no puedo ayudar.")).toThrow();
  });
});

describe("tryParseAiJson", () => {
  it("devuelve null en lugar de lanzar", () => {
    expect(tryParseAiJson("nada")).toBeNull();
    expect(tryParseAiJson<{ x: number }>('{"x":5}')).toEqual({ x: 5 });
  });
});
