import { describe, expect, it } from "vitest";
import {
  conversationXp,
  effortBonus,
  levelFromXp,
  levelTitle,
  qualityFactor,
  reviewXp,
  storyXp,
  xpToNextLevel,
} from "../lib/xp";

describe("niveles", () => {
  it("el nivel 1 empieza en 0 XP y necesita 100 para subir", () => {
    const info = levelFromXp(0);
    expect(info.level).toBe(1);
    expect(info.toNext).toBe(100);
  });

  it("la curva crece 25 por nivel", () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(125);
    expect(xpToNextLevel(3)).toBe(150);
  });

  it("subir de nivel al llegar exactamente al umbral", () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    // Nivel 3 empieza en 100 + 125 = 225
    expect(levelFromXp(224).level).toBe(2);
    expect(levelFromXp(225).level).toBe(3);
  });

  it("el progreso dentro del nivel va de 0 a 1", () => {
    const info = levelFromXp(150);
    expect(info.level).toBe(2);
    expect(info.intoLevel).toBe(50);
    expect(info.progress).toBeCloseTo(50 / 125);
  });

  it("el título cambia por tramos de nivel", () => {
    expect(levelFromXp(0).title).toBe("Curious");
    expect(levelTitle(35)).toBe("Fluent Mind");
    expect(levelTitle(20)).toBe("Conversationalist");
  });
});

describe("calidad y esfuerzo", () => {
  it("sin errores la calidad es 1", () => {
    expect(qualityFactor(0, 10)).toBe(1);
  });

  it("muchos errores por turno bajan la calidad hasta 0.6, sin bajar de ahí", () => {
    expect(qualityFactor(30, 10)).toBeCloseTo(0.6);
    expect(qualityFactor(300, 10)).toBeCloseTo(0.6);
  });

  it("una sesión sin turnos no se castiga", () => {
    expect(qualityFactor(5, 0)).toBe(1);
  });

  it("el esfuerzo es 1 XP por minuto, con tope de 15", () => {
    expect(effortBonus(0)).toBe(0);
    expect(effortBonus(600)).toBe(10);
    expect(effortBonus(3600)).toBe(15);
  });
});

describe("XP por actividad", () => {
  it("una conversación limpia da más XP que una con muchos errores", () => {
    const clean = conversationXp({ userTurns: 8, errors: 0, durationSeconds: 600 });
    const messy = conversationXp({ userTurns: 8, errors: 40, durationSeconds: 600 });
    expect(clean).toBeGreaterThan(messy);
  });

  it("el tope por conversación evita farmear turnos (40 base + 15 esfuerzo)", () => {
    expect(conversationXp({ userTurns: 100, errors: 0, durationSeconds: 99_999 })).toBe(55);
  });

  it("una historia da 30 base y hasta 60 según comprensión", () => {
    expect(storyXp(0)).toBe(30);
    expect(storyXp(100)).toBe(60);
    expect(storyXp(250)).toBe(60);
  });

  it("un repaso bien recordado vale más que uno fallado, pero el fallado también cuenta", () => {
    expect(reviewXp("good")).toBeGreaterThan(reviewXp("again"));
    expect(reviewXp("again")).toBeGreaterThan(0);
  });
});
