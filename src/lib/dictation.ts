/** Dictado: frases para escuchar y escribir, y corrección palabra por palabra. */
import { SITUATIONS } from "./situationsData";
import { levelRank } from "./storyLibrary";

export interface DiffToken {
  word: string;
  ok: boolean;
}

export interface DiffResult {
  /** Una entrada por cada palabra de la frase original. */
  tokens: DiffToken[];
  /** Palabras que se escribieron de más. */
  extra: string[];
  /** % de palabras de la frase que se acertaron. */
  accuracy: number;
}

/** Minúsculas, sin puntuación (conserva apóstrofos) y partido en palabras. */
export function normaliseWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compara lo escrito con la frase original usando la subsecuencia común más
 * larga: si falta una palabra, las siguientes no se marcan mal por el corrimiento.
 */
export function diffWords(target: string, typed: string): DiffResult {
  const tWords = target.trim().split(/\s+/).filter(Boolean);
  const a = tWords.map((w) => normaliseWords(w).join(""));
  const b = normaliseWords(typed);

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ok = new Array<boolean>(n).fill(false);
  const used = new Array<boolean>(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ok[i] = true;
      used[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const matched = ok.filter(Boolean).length;
  return {
    tokens: tWords.map((word, k) => ({ word, ok: ok[k] })),
    extra: b.filter((_, k) => !used[k]),
    accuracy: n === 0 ? 0 : Math.round((matched / n) * 100),
  };
}

/** Frases de las situaciones cercanas al nivel de la persona, mezcladas. */
export function pickSentences(userLevel: string | null | undefined, count = 6, rng: () => number = Math.random): string[] {
  const me = levelRank(userLevel ?? "A1");
  const pool = new Set<string>();
  for (const s of SITUATIONS) {
    const r = levelRank(s.level);
    if (r > me + 1) continue;
    for (const p of s.phrases) pool.add(p.en);
    for (const l of s.dialogue.lines) pool.add(l.en);
  }
  const words = (t: string) => t.split(/\s+/).length;
  const usable = [...pool].filter((t) => words(t) >= 3 && words(t) <= 14);
  const shuffled = [...usable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
