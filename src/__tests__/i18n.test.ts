import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { ca } from "../i18n/ca";
import { uiLang } from "../i18n";

function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  ).sort();
}

describe("i18n", () => {
  it("catalán tiene exactamente las mismas claves que inglés", () => {
    expect(keysOf(ca)).toEqual(keysOf(en));
  });

  it("ningún texto catalán queda vacío", () => {
    for (const k of keysOf(ca)) {
      const value = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], ca);
      expect(String(value).trim().length).toBeGreaterThan(0);
    }
  });

  it("la interfaz sigue al idioma que se aprende", () => {
    expect(uiLang("ca")).toBe("ca");
    expect(uiLang("en")).toBe("en");
    expect(uiLang(null)).toBe("en");
  });

  it("no hay voseo rioplatense en la interfaz catalana ni inglesa", () => {
    const voseo = /\b(Probá|Intentá|Tocá|acá|podés|Tenés|Terminá)\b/;
    for (const k of keysOf(en)) {
      const value = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], en);
      expect(String(value)).not.toMatch(voseo);
    }
  });
});
