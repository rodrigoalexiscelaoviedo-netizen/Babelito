import { describe, expect, it } from "vitest";
import {
  levelRank,
  presentCategories,
  readingMinutes,
  sortForLearner,
  storyCategory,
} from "../lib/storyLibrary";

describe("storyCategory", () => {
  it("clasifica los temas de las historias de la app", () => {
    expect(storyCategory("fantasy / adventure")).toBe("Fantasy");
    expect(storyCategory("fantasy / humor")).toBe("Fantasy");
    expect(storyCategory("mystery")).toBe("Mystery");
    expect(storyCategory("brain / habits")).toBe("Mind");
    expect(storyCategory("neuroscience / learning")).toBe("Mind");
    expect(storyCategory("history")).toBe("History");
    expect(storyCategory("history / space")).toBe("History");
    expect(storyCategory("classic retelling / psychology")).toBe("Mind");
    expect(storyCategory("music / DJ")).toBe("Music");
    expect(storyCategory("travel")).toBe("Travel");
    expect(storyCategory("investments")).toBe("Money");
  });

  it("lo desconocido o vacío va a Life", () => {
    expect(storyCategory("a baker who learns to dance")).toBe("Life");
    expect(storyCategory(null)).toBe("Life");
    expect(storyCategory("")).toBe("Life");
  });
});

describe("readingMinutes", () => {
  it("mínimo 1 minuto", () => {
    expect(readingMinutes("Hola mundo")).toBe(1);
  });
  it("calcula por palabras (~130/min)", () => {
    expect(readingMinutes("palabra ".repeat(260))).toBe(2);
    expect(readingMinutes("palabra ".repeat(390))).toBe(3);
  });
});

describe("levelRank", () => {
  it("ordena A1 < A2 < B1 < B2 < C1 y desconocidos al final", () => {
    expect(levelRank("A1")).toBeLessThan(levelRank("A2"));
    expect(levelRank("B2")).toBeLessThan(levelRank("C1"));
    expect(levelRank("??")).toBe(99);
  });
});

describe("sortForLearner", () => {
  const stories = [
    { id: "c1", level: "C1", created_at: "2026-01-01" },
    { id: "a1", level: "A1", created_at: "2026-01-02" },
    { id: "a2", level: "A2", created_at: "2026-01-03" },
    { id: "b1", level: "B1", created_at: "2026-01-04" },
    { id: "b2", level: "B2", created_at: "2026-01-05" },
  ];

  it("para un A1: primero A1 y A2 sin leer, luego el resto por nivel", () => {
    const ids = sortForLearner(stories, "A1", new Set()).map((s) => s.id);
    expect(ids.slice(0, 2).sort()).toEqual(["a1", "a2"]);
    expect(ids.slice(2)).toEqual(["b1", "b2", "c1"]);
  });

  it("las leídas van al final", () => {
    const ids = sortForLearner(stories, "A1", new Set(["a1"])).map((s) => s.id);
    expect(ids[ids.length - 1]).toBe("a1");
  });

  it("sin nivel conocido no rompe", () => {
    expect(sortForLearner(stories, null, new Set())).toHaveLength(5);
  });

  it("no modifica el arreglo original", () => {
    const copy = [...stories];
    sortForLearner(stories, "B1", new Set());
    expect(stories).toEqual(copy);
  });
});

describe("presentCategories", () => {
  it("solo devuelve las categorías que existen, en orden fijo", () => {
    expect(presentCategories(["history", "fantasy", "history / space", null])).toEqual(["Fantasy", "History", "Life"]);
  });
});
