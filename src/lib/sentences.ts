/**
 * Parte un texto en oraciones para practicar shadowing una por una.
 * Corta después de . ! ? (y su cierre con comillas) seguido de espacio o fin de texto.
 * No parte abreviaturas comunes (Mr., Dr., etc.) ni números decimales.
 */
const ABBREV = /\b(Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)\.$/i;

export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts: string[] = [];
  let start = 0;
  const re = /[.!?]["'”’)]*(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const end = m.index + m[0].length;
    const candidate = clean.slice(start, end).trim();
    if (ABBREV.test(candidate)) continue;
    if (candidate) parts.push(candidate);
    start = end;
  }
  const rest = clean.slice(start).trim();
  if (rest) parts.push(rest);
  return parts;
}
