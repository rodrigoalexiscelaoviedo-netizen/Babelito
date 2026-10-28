import { describe, expect, it } from "vitest";

/**
 * Valida las historias que se cargan por migración (supabase/migrations/*.sql):
 * cada una debe tener 3 preguntas con 4 opciones y una respuesta válida,
 * y la biblioteca debe cubrir todos los niveles desde A1.
 */
const files = import.meta.glob("../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const sql = Object.entries(files)
  .filter(([path]) => /\/(0005|0006|0007|0008|0009)_/.test(path))
  .map(([, content]) => content)
  .join("\n");

interface SeedStory { id: string; title: string; level: string; questions: Array<{ question: string; options: string[]; correct_index: number }> }

function parseStories(text: string): SeedStory[] {
  const out: SeedStory[] = [];
  const re = /\('(7f1c2a10-[0-9a-f-]+)',\s*'([^']+)',\s*'([A-C][12])',[\s\S]*?\$q\$([\s\S]*?)\$q\$::jsonb\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ id: m[1], title: m[2], level: m[3], questions: JSON.parse(m[4]) });
  return out;
}

const stories = parseStories(sql);

describe("historias cargadas por migración", () => {
  it("encuentra las historias (9 de la 0005 + 4 de la 0006)", () => {
    expect(stories.length).toBeGreaterThanOrEqual(13);
  });

  it("los ids son únicos", () => {
    expect(new Set(stories.map((s) => s.id)).size).toBe(stories.length);
  });

  it("cada historia tiene 3 preguntas de 4 opciones con respuesta válida", () => {
    for (const s of stories) {
      expect(s.questions, s.title).toHaveLength(3);
      for (const q of s.questions) {
        expect(q.options, `${s.title}: ${q.question}`).toHaveLength(4);
        expect(q.correct_index, `${s.title}: ${q.question}`).toBeGreaterThanOrEqual(0);
        expect(q.correct_index, `${s.title}: ${q.question}`).toBeLessThan(4);
      }
    }
  });

  it("hay historias A1 para principiantes", () => {
    expect(stories.filter((s) => s.level === "A1").length).toBeGreaterThanOrEqual(4);
  });

  it("cubre A1, A2, B1 y B2", () => {
    const levels = new Set(stories.map((s) => s.level));
    for (const l of ["A1", "A2", "B1", "B2"]) expect(levels.has(l), l).toBe(true);
  });
});
