/**
 * Lógica de la biblioteca de historias: categorías por tema, tiempo de lectura
 * y orden "para vos". Funciones puras (testeadas), sin acceso a la base.
 */

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

export function levelRank(level: string): number {
  const i = (LEVELS as readonly string[]).indexOf(level);
  return i < 0 ? 99 : i;
}

export type StoryCategory = "Fantasy" | "Mystery" | "Mind" | "History" | "Music" | "Travel" | "Money" | "Life";

const CATEGORY_KEYWORDS: Array<[StoryCategory, RegExp]> = [
  ["Fantasy", /fantasy|adventure|dragon|magic|wizard|myth|fairy/i],
  ["Mystery", /mystery|detective|crime|clue|thriller/i],
  ["Mind", /brain|neuro|habit|psycholog|mind|learning|memory/i],
  ["History", /histor|space|classic|ancient|war|empire/i],
  ["Music", /music|dj\b|festival|concert|song/i],
  ["Travel", /travel|trip|nomad|edinburgh|barcelona|city|holiday/i],
  ["Money", /invest|financ|money|income|saving|budget/i],
];

/** Categoría para filtrar. Las que no encajan en ninguna van a "Life". */
export function storyCategory(topic: string | null | undefined): StoryCategory {
  const t = topic ?? "";
  for (const [category, re] of CATEGORY_KEYWORDS) if (re.test(t)) return category;
  return "Life";
}

/** Minutos de lectura para un estudiante (≈130 palabras por minuto), mínimo 1. */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 130));
}

interface Sortable {
  id: string;
  level: string;
  created_at?: string;
}

/**
 * Orden "para vos":
 *  1. Sin leer, en tu nivel o uno por encima (lo que conviene leer ahora).
 *  2. Sin leer, el resto, de menor a mayor nivel.
 *  3. Ya leídas, al final.
 * Dentro de cada grupo, lo más reciente primero.
 */
export function sortForLearner<T extends Sortable>(
  stories: T[],
  userLevel: string | null | undefined,
  completedIds: Set<string>
): T[] {
  const me = userLevel ? levelRank(userLevel) : 1;
  const group = (s: T) => {
    if (completedIds.has(s.id)) return 2;
    const r = levelRank(s.level);
    return r >= me && r <= me + 1 ? 0 : 1;
  };
  return [...stories].sort((a, b) => {
    const g = group(a) - group(b);
    if (g !== 0) return g;
    if (group(a) === 1) {
      const l = levelRank(a.level) - levelRank(b.level);
      if (l !== 0) return l;
    }
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}

/** Categorías presentes en una lista, en el orden en que se muestran los chips. */
export function presentCategories(topics: Array<string | null | undefined>): StoryCategory[] {
  const order: StoryCategory[] = ["Fantasy", "Mystery", "Mind", "History", "Music", "Travel", "Money", "Life"];
  const present = new Set(topics.map(storyCategory));
  return order.filter((c) => present.has(c));
}

const CATEGORY_CA: Record<StoryCategory, string> = {
  Fantasy: "Fantasia",
  Mystery: "Misteri",
  Mind: "Ment",
  History: "Història",
  Music: "Música",
  Travel: "Viatges",
  Money: "Diners",
  Life: "Vida",
};

export function categoryLabel(category: StoryCategory, lang: "en" | "ca"): string {
  return lang === "ca" ? CATEGORY_CA[category] : category;
}
