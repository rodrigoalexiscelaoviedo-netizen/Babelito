/**
 * Definiciones y ejemplos en inglés simple para las tarjetas de repaso.
 * Se piden a la IA en UNA sola llamada por sesión y se guardan en el navegador,
 * así cada ítem se genera una vez. Si falla, el repaso funciona igual (sin contexto).
 */
import { askCoach } from "./claude";
import { tryParseAiJson } from "./json";
import type { ReviewMeta } from "./reviewCards";

const STORE_KEY = "babelito:review-meta:v1";
const BATCH = 12;

export const metaKey = (content: string) => content.toLowerCase().replace(/\s+/g, " ").trim();

function readStore(): Record<string, ReviewMeta> {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, ReviewMeta>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ReviewMeta>) {
  try {
    // Tope para no llenar el almacenamiento.
    const entries = Object.entries(store);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-400))));
  } catch {
    /* sin almacenamiento: se regenera la próxima vez */
  }
}

interface RawMeta {
  items?: Array<{ content?: unknown; definition?: unknown; example?: unknown }>;
}

/** Valida la respuesta de la IA: el ejemplo debe contener el ítem; la definición, ser breve. */
export function parseMeta(raw: string, wanted: string[]): Record<string, ReviewMeta> {
  const data = tryParseAiJson<RawMeta>(raw);
  const out: Record<string, ReviewMeta> = {};
  const allowed = new Set(wanted.map(metaKey));
  for (const it of data?.items ?? []) {
    if (typeof it.content !== "string") continue;
    const key = metaKey(it.content);
    if (!allowed.has(key)) continue;
    const definition = typeof it.definition === "string" ? it.definition.trim().slice(0, 140) : "";
    let example = typeof it.example === "string" ? it.example.trim().slice(0, 200) : "";
    if (example && !example.toLowerCase().includes(key)) example = "";
    if (definition || example) out[key] = { definition, example };
  }
  return out;
}

/** Devuelve el contexto de cada ítem (desde la caché y, si falta, pidiéndolo a la IA). */
export async function loadReviewMeta(items: Array<{ content: string; item_type: string }>): Promise<Record<string, ReviewMeta>> {
  const store = readStore();
  const missing = items.filter((i) => !store[metaKey(i.content)]).slice(0, BATCH);
  if (missing.length > 0) {
    try {
      const list = missing.map((m) => `- ${m.content} (${m.item_type === "word" ? "word" : "phrase"})`).join("\n");
      const raw = await askCoach({
        system:
          `You help a Spanish-speaking learner understand English vocabulary. For each item reply with a simple English definition (max 12 words, level A2, no Spanish) ` +
          `and ONE natural example sentence that contains the item EXACTLY as written. Reply ONLY with JSON: {"items":[{"content":"item exactly as given","definition":"...","example":"..."}]}.`,
        messages: [{ role: "user", content: `Items:\n${list}` }],
        maxTokens: 1200,
        temperature: 0.4,
        json: true,
      });
      Object.assign(store, parseMeta(raw, missing.map((m) => m.content)));
      writeStore(store);
    } catch {
      /* el repaso sigue sin contexto */
    }
  }
  return store;
}
