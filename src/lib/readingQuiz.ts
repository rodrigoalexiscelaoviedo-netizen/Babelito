/**
 * Preguntas de comprensión para cerrar una lectura. Las genera el coach en
 * inglés simple (nivel del texto) y se guardan en el navegador por texto, así
 * que cada lectura gasta una sola llamada.
 */
import { askCoach } from "./claude";
import { parseAiJson } from "./json";

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Índice de la opción correcta dentro de `options`. */
  answer: number;
}

const CACHE_PREFIX = "babelito:rq:v1:";
const MAX_TEXT_CHARS = 2500;

function shuffleKeeping(question: QuizQuestion, rng: () => number): QuizQuestion {
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    q: question.q,
    options: order.map((i) => question.options[i]),
    answer: order.indexOf(question.answer),
  };
}

/** Valida la respuesta del coach y mezcla las opciones (los modelos tienden a poner la correcta primero). */
export function parseQuiz(raw: unknown, rng: () => number = Math.random): QuizQuestion[] {
  const list = (raw as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];
  const out: QuizQuestion[] = [];
  for (const item of list) {
    const q = typeof item?.q === "string" ? item.q.trim() : "";
    const options: string[] = Array.isArray(item?.options)
      ? item.options.filter((o: unknown): o is string => typeof o === "string" && o.trim() !== "").map((o: string) => o.trim())
      : [];
    const answer = Number.isInteger(item?.answer) ? (item.answer as number) : -1;
    if (!q || options.length < 3 || options.length > 4 || new Set(options).size !== options.length) continue;
    if (answer < 0 || answer >= options.length) continue;
    out.push(shuffleKeeping({ q, options, answer }, rng));
    if (out.length === 3) break;
  }
  return out;
}

/** Clave corta y estable para textos pegados por la persona (no tienen id). */
export function textKey(id: string, content: string): string {
  if (id !== "custom") return id;
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0;
  return `c${(h >>> 0).toString(36)}`;
}

function readCache(key: string): QuizQuestion[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizQuestion[];
    return Array.isArray(parsed) && parsed.length >= 2 ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, quiz: QuizQuestion[]) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(quiz));
  } catch {
    /* sin almacenamiento: se vuelve a generar la próxima vez */
  }
}

export async function loadReadingQuiz(id: string, content: string, level: string): Promise<QuizQuestion[]> {
  const key = textKey(id, content);
  const cached = readCache(key);
  if (cached) return cached;

  const raw = await askCoach({
    json: true,
    system: `You write reading-comprehension questions for a Spanish-speaking learner of English at level ${level}.
Use simple English (level ${level} or easier). Respond ONLY with a single valid JSON object, no markdown:
{"questions":[{"q":"...","options":["...","...","..."],"answer":0}]}
Write exactly 3 questions about the main ideas or key details of the text. Each question has exactly 3 short options and only one is correct. "answer" is the index (0 to 2) of the correct option. Never ask for opinions.`,
    messages: [{ role: "user", content: content.slice(0, MAX_TEXT_CHARS) }],
    maxTokens: 700,
    temperature: 0.3,
  });
  const quiz = parseQuiz(parseAiJson<unknown>(raw));
  if (quiz.length >= 2) writeCache(key, quiz);
  return quiz;
}
