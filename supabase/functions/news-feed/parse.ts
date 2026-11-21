/**
 * Parser de feeds Atom (GitHub releases) sin dependencias. Es código puro: lo usa
 * la función news-feed y lo prueban los tests de Vitest.
 */

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  published: string;
  source: string;
  summary: string;
}

const MAX_SUMMARY = 320;

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Texto plano corto a partir del contenido HTML de una entrada. */
export function summarize(html: string, max = MAX_SUMMARY): string {
  const plain = decodeEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? decodeEntities(m[1]).trim() : "";
}

function linkOf(block: string): string {
  const m = /<link[^>]*href="([^"]+)"/.exec(block);
  return m ? decodeEntities(m[1]) : "";
}

/** Convierte un feed Atom en entradas. Ignora entradas sin título o sin enlace https. */
export function parseAtom(xml: string, source: string): NewsItem[] {
  const feedTitle = tag(xml.replace(/<entry>[\s\S]*?<\/entry>/g, ""), "title");
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = m[1];
    const title = tag(block, "title");
    const link = linkOf(block);
    if (!title || !/^https:\/\//.test(link)) continue;
    const published = tag(block, "updated") || tag(block, "published");
    const content = tag(block, "content");
    out.push({
      id: tag(block, "id") || link,
      title,
      link,
      published,
      source: feedTitle || source,
      summary: summarize(content),
    });
  }
  return out;
}
