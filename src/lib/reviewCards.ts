/**
 * Repaso en inglés primero. Cada tarjeta elige un ejercicio según qué tan
 * firme está el ítem (reps) y nunca pide traducir desde el español:
 *
 *   reps 0  → "meet": se ve y se oye la frase con su definición y un ejemplo.
 *   reps 1  → "listen": se oye y se elige la frase escrita (3 opciones).
 *   reps 2  → "gap": se completa la palabra que falta (preposiciones, artículos…).
 *   reps 3+ → "say": se escucha y se repite en voz alta (alterna con "gap").
 *
 * Todo lo de este archivo es puro y está testeado; las opciones falsas salen de
 * tu propio mazo y de las frases de Situaciones.
 */
import { SITUATIONS } from "./situationsData";

export type CardKind = "meet" | "listen" | "gap" | "say";

export interface CardItem {
  id: string;
  item_type: "chunk" | "word";
  content: string;
  /** Significado en español: solo se muestra si la persona lo pide. */
  prompt: string;
  reps: number;
}

export interface ReviewMeta {
  /** Definición en inglés simple. */
  definition: string;
  /** Frase de ejemplo que contiene el ítem. */
  example: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

/** Grupos de palabras que los hispanohablantes confunden: ahí están los mejores huecos. */
export const CONFUSABLES: string[][] = [
  ["in", "on", "at"],
  ["to", "for", "of"],
  ["a", "an", "the"],
  ["is", "are", "am"],
  ["do", "does", "did"],
  ["have", "has", "had"],
  ["can", "could", "would"],
  ["this", "that", "these"],
  ["much", "many", "more"],
  ["with", "without", "by"],
];

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "i", "you", "it", "my", "me", "is", "are", "in", "on", "at", "for"]);

export function shuffleWith<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Qué ejercicio toca para este ítem. `rng` decide la alternancia en los firmes. */
export function cardKindFor(item: Pick<CardItem, "reps" | "item_type" | "content">, hasExample: boolean, rng: () => number = Math.random): CardKind {
  if (item.reps <= 0) return "meet";
  if (item.reps === 1) return "listen";
  const canGap = item.item_type === "chunk" ? item.content.trim().split(/\s+/).length >= 3 : hasExample;
  if (item.reps === 2) return canGap ? "gap" : "listen";
  if (item.item_type === "word") return rng() < 0.5 ? "listen" : "say";
  return canGap && rng() < 0.5 ? "gap" : "say";
}

// ── Reserva de frases/palabras para opciones falsas ──────────────────────────────

export interface Pool {
  chunks: string[];
  words: string[];
}

const SITUATION_POOL: Pool = {
  chunks: SITUATIONS.flatMap((s) => s.phrases.map((p) => p.en)),
  words: SITUATIONS.flatMap((s) => s.words.map((w) => w.en)),
};

/** Mazo de la persona + frases de Situaciones, sin repetidos. */
export function buildPool(deck: Array<Pick<CardItem, "item_type" | "content">>): Pool {
  const chunks = new Set<string>(SITUATION_POOL.chunks);
  const words = new Set<string>(SITUATION_POOL.words);
  for (const d of deck) (d.item_type === "chunk" ? chunks : words).add(d.content);
  return { chunks: [...chunks], words: [...words] };
}

function similarity(a: string, b: string): number {
  // Prefiere opciones de largo parecido para que no se adivine por tamaño.
  return Math.abs(a.split(/\s+/).length - b.split(/\s+/).length) * 2 + Math.abs(a.length - b.length) / 10;
}

export interface ListenCard {
  options: string[];
  correctIndex: number;
}

/** 3 opciones escritas (la correcta + 2 parecidas del mismo tipo). */
export function buildListen(item: Pick<CardItem, "item_type" | "content">, pool: Pool, rng: () => number = Math.random): ListenCard {
  const source = item.item_type === "chunk" ? pool.chunks : pool.words;
  const target = norm(item.content);
  const candidates = source
    .filter((c) => norm(c) !== target)
    .sort((a, b) => similarity(a, item.content) - similarity(b, item.content));
  // Se elige entre las 12 más parecidas para variar sin volverse trivial.
  const close = shuffleWith(candidates.slice(0, 12), rng).slice(0, 2);
  const options = shuffleWith([item.content, ...close], rng);
  return { options, correctIndex: options.indexOf(item.content) };
}

export interface GapCard {
  /** Texto antes del hueco, con espacio final si hace falta. */
  before: string;
  after: string;
  answer: string;
  options: string[];
  correctIndex: number;
}

function groupOf(word: string): string[] | null {
  const w = word.toLowerCase();
  return CONFUSABLES.find((g) => g.includes(w)) ?? null;
}

/** Hueco en una frase: prioriza palabras que se confunden (in/on/at, a/an/the…). */
export function buildGapFromPhrase(content: string, pool: Pool, rng: () => number = Math.random): GapCard | null {
  const tokens = content.trim().split(/\s+/);
  if (tokens.length < 3) return null;
  const core = (t: string) => t.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");

  const confusable = tokens.map((t, i) => ({ i, g: groupOf(core(t)) })).filter((x) => x.g);
  const wordsAvailable = tokens.map((t, i) => ({ i, w: core(t) })).filter((x) => x.w.length >= 4 && !STOP.has(x.w.toLowerCase()));

  let pickIndex: number;
  let wrong: string[];

  if (confusable.length > 0 && (wordsAvailable.length === 0 || rng() < 0.65)) {
    const chosen = confusable[Math.floor(rng() * confusable.length)];
    pickIndex = chosen.i;
    const answer = core(tokens[pickIndex]).toLowerCase();
    wrong = shuffleWith((chosen.g as string[]).filter((w) => w !== answer), rng).slice(0, 2);
    const capital = /^[A-Z]/.test(core(tokens[pickIndex]));
    if (capital) wrong = wrong.map((w) => w[0].toUpperCase() + w.slice(1));
  } else if (wordsAvailable.length > 0) {
    const chosen = wordsAvailable[Math.floor(rng() * wordsAvailable.length)];
    pickIndex = chosen.i;
    const answer = chosen.w;
    const allWords = pool.chunks.flatMap((c) => c.split(/\s+/).map(core)).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()) && w.toLowerCase() !== answer.toLowerCase());
    const near = [...new Set(allWords)].sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length)).slice(0, 14);
    wrong = shuffleWith(near, rng).slice(0, 2);
  } else {
    return null;
  }
  if (wrong.length < 2) return null;

  const original = tokens[pickIndex];
  const answer = core(original);
  const at = original.indexOf(answer);
  const lead = original.slice(0, at);
  const trail = original.slice(at + answer.length);
  const options = shuffleWith([answer, ...wrong], rng);
  const head = tokens.slice(0, pickIndex).join(" ");
  const rest = tokens.slice(pickIndex + 1).join(" ");
  return {
    before: head ? `${head} ${lead}` : lead,
    after: rest ? `${trail} ${rest}` : trail,
    answer,
    options,
    correctIndex: options.indexOf(answer),
  };
}

/**
 * Hueco para una palabra suelta usando la frase de ejemplo ("I need a ___ to the airport").
 * El ejemplo debe contener la palabra; si no, devuelve null.
 */
export function buildGapFromExample(word: string, example: string, pool: Pool, rng: () => number = Math.random): GapCard | null {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const m = re.exec(example);
  if (!m) return null;
  const others = pool.words.filter((w) => norm(w) !== norm(word) && !w.includes(" "));
  const near = others.sort((a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length)).slice(0, 12);
  const wrong = shuffleWith(near, rng).slice(0, 2);
  if (wrong.length < 2) return null;
  const options = shuffleWith([m[0], ...wrong], rng);
  return {
    before: example.slice(0, m.index),
    after: example.slice(m.index + m[0].length),
    answer: m[0],
    options,
    correctIndex: options.indexOf(m[0]),
  };
}

/** Cuántas tarjetas por sesión (más cortas = se termina más seguido). */
export const SESSION_SIZE = 12;
