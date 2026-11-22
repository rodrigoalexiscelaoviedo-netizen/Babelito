import { describe, expect, it } from "vitest";
import {
  DONT_KNOW,
  LEVELS,
  MAX_ITEMS,
  MIN_ITEMS,
  bankCoverage,
  combineWithOral,
  estimateWrittenLevel,
  initialState,
  isDone,
  nextItem,
  recordAnswer,
  type PlacementItem,
  type PlacementState,
} from "../lib/placement";
import { PLACEMENT_CA, PLACEMENT_EN, bankFor } from "../lib/placementBank";
import { SUBMIT_RATING_TOOL, examinerSystemPrompt, normalizeExaminerRating } from "../lib/placementExaminer";

/** Generador determinista (mulberry32) para que las simulaciones se repitan. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Corre el test completo con una persona simulada. `answerFn` decide la opción elegida. */
function runSimulation(bank: PlacementItem[], seed: number, answerFn: (item: PlacementItem, rng: () => number) => number) {
  const rng = mulberry32(seed);
  let s: PlacementState = initialState();
  let guard = 0;
  while (!isDone(s) && guard++ < 50) {
    const item = nextItem(s, bank, rng);
    if (!item) break;
    s = recordAnswer(s, item, answerFn(item, rng));
  }
  return { level: estimateWrittenLevel(s), n: s.history.length, state: s };
}

/** Persona con habilidad `ability` (índice de nivel): acierta casi siempre en lo que domina. */
const ability = (abilityIdx: number) => (item: PlacementItem, rng: () => number) => {
  const dominates = LEVELS.indexOf(item.level) <= abilityIdx;
  const correct = rng() < (dominates ? 0.9 : 0.1);
  return correct ? item.answer : (item.answer + 1) % 4;
};

/** Persona que adivina al azar (25 % de acierto). */
const guesser = (_item: PlacementItem, rng: () => number) => Math.floor(rng() * 4);

describe("banco del test de nivel", () => {
  for (const [name, bank] of [["en", PLACEMENT_EN], ["ca", PLACEMENT_CA]] as const) {
    it(`${name}: 8 ítems por escalón, con todos los formatos`, () => {
      const cov = bankCoverage(bank);
      for (const l of LEVELS) {
        const total = Object.values(cov[l]).reduce((a, b) => a + b, 0);
        expect(total, `${name} ${l}`).toBe(8);
        expect(cov[l].choice, `${name} ${l} choice`).toBeGreaterThanOrEqual(2);
        expect(cov[l].fix, `${name} ${l} fix`).toBeGreaterThanOrEqual(2);
        expect(cov[l].listen, `${name} ${l} listen`).toBeGreaterThanOrEqual(1);
        expect(cov[l].visual, `${name} ${l} visual`).toBeGreaterThanOrEqual(1);
      }
    });

    it(`${name}: ids únicos, 4 opciones, respuesta válida y opciones distintas`, () => {
      const ids = bank.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const i of bank) {
        expect(i.options, i.id).toHaveLength(4);
        expect(i.answer, i.id).toBeGreaterThanOrEqual(0);
        expect(i.answer, i.id).toBeLessThan(4);
        expect(new Set(i.options).size, i.id).toBe(4);
      }
    });

    it(`${name}: los ítems de escucha tienen audio y los visuales, emoji`, () => {
      for (const i of bank) {
        if (i.format === "listen") expect(i.audio, i.id).toBeTruthy();
        if (i.format === "visual") expect(i.visual, i.id).toBeTruthy();
      }
    });
  }

  it("bankFor elige el banco según el idioma", () => {
    expect(bankFor("ca")).toBe(PLACEMENT_CA);
    expect(bankFor("en")).toBe(PLACEMENT_EN);
  });
});

describe("escalera adaptativa", () => {
  const item = (levelIdx: number, answer = 0): PlacementItem => ({
    id: `t-${levelIdx}-${Math.random()}`,
    level: LEVELS[levelIdx],
    skill: "grammar",
    format: "choice",
    prompt: "x",
    options: ["a", "b", "c", "d"],
    answer,
  });

  it("empieza en B1", () => {
    expect(estimateWrittenLevel(initialState())).toBe("B1");
  });

  it("sube con un acierto y baja con un error", () => {
    const s0 = initialState();
    const up = recordAnswer(s0, item(2, 0), 0);
    expect(up.levelIdx).toBe(3);
    const down = recordAnswer(s0, item(2, 0), 1);
    expect(down.levelIdx).toBe(1);
  });

  it("'No lo sé' cuenta como error aunque la opción 0 sea la correcta", () => {
    const s = recordAnswer(initialState(), item(2, 0), DONT_KNOW);
    expect(s.history[0].correct).toBe(false);
    expect(s.levelIdx).toBe(1);
  });

  it("no se sale de A1 ni de C1", () => {
    let s = initialState();
    for (let k = 0; k < 10; k++) s = recordAnswer(s, item(0, 1), 0);
    expect(s.levelIdx).toBe(0);
    s = initialState();
    for (let k = 0; k < 10; k++) s = recordAnswer(s, item(4, 0), 0);
    expect(s.levelIdx).toBe(4);
  });

  it("no termina antes del mínimo de ítems", () => {
    let s = initialState();
    for (let k = 0; k < MIN_ITEMS - 1; k++) s = recordAnswer(s, item(2, 0), 0);
    expect(isDone(s)).toBe(false);
  });

  it("termina al llegar al máximo aunque no se estabilice", () => {
    let s = initialState();
    for (let k = 0; k < MAX_ITEMS; k++) s = recordAnswer(s, item(2, 0), k % 2 === 0 ? 0 : 1);
    expect(isDone(s)).toBe(true);
  });

  it("nextItem no repite ítems", () => {
    const bank = PLACEMENT_EN;
    const { state } = runSimulation(bank, 7, ability(2));
    const ids = state.history.map((h) => h.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nextItem varía formatos: no hay tres seguidos del mismo", () => {
    const bank = PLACEMENT_EN;
    for (const seed of [1, 2, 3, 4, 5]) {
      const { state } = runSimulation(bank, seed, ability(3));
      const f = state.history.map((h) => h.format);
      for (let k = 2; k < f.length; k++) {
        const triple = f[k] === f[k - 1] && f[k - 1] === f[k - 2];
        expect(triple, `seed ${seed} posición ${k}`).toBe(false);
      }
    }
  });
});

describe("simulación de personas", () => {
  // Con el banco inglés, una persona de habilidad X debe quedar a ±1 escalón de X
  // en la mayoría de las corridas. Así se detecta si la escalera se va de rango.
  for (let a = 0; a < LEVELS.length; a++) {
    it(`habilidad ${LEVELS[a]}: el resultado queda a ±1 escalón`, () => {
      let ok = 0;
      const runs = 40;
      for (let seed = 1; seed <= runs; seed++) {
        const r = runSimulation(PLACEMENT_EN, seed * 31 + a, ability(a));
        if (Math.abs(LEVELS.indexOf(r.level) - a) <= 1) ok++;
      }
      expect(ok / runs).toBeGreaterThanOrEqual(0.8);
    });
  }

  it("quien adivina al azar no pasa de A2 (la opción de acertar al azar no sube el nivel)", () => {
    let ok = 0;
    const runs = 60;
    for (let seed = 1; seed <= runs; seed++) {
      const r = runSimulation(PLACEMENT_EN, seed * 17, guesser);
      if (LEVELS.indexOf(r.level) <= 1) ok++;
    }
    expect(ok / runs).toBeGreaterThanOrEqual(0.8);
  });

  it("el banco catalán también separa niveles", () => {
    let low = 0;
    let high = 0;
    for (let seed = 1; seed <= 30; seed++) {
      if (LEVELS.indexOf(runSimulation(PLACEMENT_CA, seed, ability(0)).level) <= 1) low++;
      if (LEVELS.indexOf(runSimulation(PLACEMENT_CA, seed, ability(4)).level) >= 3) high++;
    }
    expect(low / 30).toBeGreaterThanOrEqual(0.7);
    expect(high / 30).toBeGreaterThanOrEqual(0.7);
  });
});

describe("combinación escrito + oral", () => {
  it("sin evaluación oral vale el escrito", () => {
    expect(combineWithOral("B2", null)).toBe("B2");
  });

  it("el oral mueve el resultado como mucho un escalón", () => {
    expect(combineWithOral("B1", "C1")).toBe("B2");
    expect(combineWithOral("C1", "A1")).toBe("B2");
    expect(combineWithOral("B1", "B1")).toBe("B1");
    expect(combineWithOral("A2", "B1")).toBe("B1");
  });

  it("nunca sale del rango A1–C1", () => {
    expect(combineWithOral("A1", "A1")).toBe("A1");
    expect(combineWithOral("C1", "C1")).toBe("C1");
  });
});

describe("examinador por voz", () => {
  it("el prompt existe en inglés y en catalán y menciona la herramienta", () => {
    for (const lang of ["en", "ca"] as const) {
      const p = examinerSystemPrompt(lang);
      expect(p.length).toBeGreaterThan(200);
      expect(p).toContain("submit_rating");
    }
  });

  it("la herramienta de calificación declara el nivel con valores válidos", () => {
    expect(SUBMIT_RATING_TOOL.name).toBe("submit_rating");
    expect(SUBMIT_RATING_TOOL.parameters.properties.cefr.enum).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    expect(SUBMIT_RATING_TOOL.parameters.required).toEqual(["cefr"]);
  });

  it("normaliza una calificación válida y limita las puntuaciones a 1–5", () => {
    const r = normalizeExaminerRating({ cefr: "b2", range: 9, accuracy: -3, vocabulary: "4", fluency: 3.6, coherence: "x", evidence: "  I think it is good.  " });
    expect(r).toEqual({ cefr: "B2", range: 5, accuracy: 1, vocabulary: 4, fluency: 4, coherence: 1, evidence: "I think it is good." });
  });

  it("descarta un nivel inválido", () => {
    expect(normalizeExaminerRating({ cefr: "D9" })).toBeNull();
    expect(normalizeExaminerRating({})).toBeNull();
  });
});
