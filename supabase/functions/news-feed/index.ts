/**
 * news-feed — titulares de IA (releases de GitHub) para la sección Noticias.
 *
 * Trae solo una lista cerrada de feeds (ALLOWLIST), así la función no puede usarse
 * como proxy para cualquier URL. Devuelve título, resumen corto, fecha y enlace
 * al original; nunca el contenido completo.
 */
import { parseAtom, type NewsItem } from "./parse.ts";

const ALLOWLIST: Array<{ url: string; source: string }> = [
  { url: "https://github.com/anthropics/claude-code/releases.atom", source: "Claude Code" },
  { url: "https://github.com/anthropics/anthropic-sdk-typescript/releases.atom", source: "Anthropic SDK (TypeScript)" },
  { url: "https://github.com/anthropics/anthropic-sdk-python/releases.atom", source: "Anthropic SDK (Python)" },
  { url: "https://github.com/vercel/ai/releases.atom", source: "Vercel AI SDK" },
  { url: "https://github.com/huggingface/transformers/releases.atom", source: "Hugging Face Transformers" },
];

const MAX_ITEMS = 30;
const ALLOWED_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "").trim();

function cors(origin: string | null) {
  const allow = ALLOWED_ORIGIN ? (origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN) : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

async function loadFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Babelito-news/1.0", Accept: "application/atom+xml" } });
    if (!res.ok) return [];
    return parseAtom(await res.text(), source);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  const c = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: c });

  const results = await Promise.all(ALLOWLIST.map((f) => loadFeed(f.url, f.source)));
  const items = results
    .flat()
    .sort((a, b) => (b.published || "").localeCompare(a.published || ""))
    .slice(0, MAX_ITEMS);

  return new Response(JSON.stringify({ items, fetchedAt: new Date().toISOString() }), {
    headers: { ...c, "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" },
  });
});
