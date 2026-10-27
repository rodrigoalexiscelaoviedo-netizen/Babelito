/**
 * Devuelve el texto de la sección del corrector cuyo título (en **negrita**)
 * coincide con `keyword`, p. ej. /natural/i → la versión natural.
 */
export function sectionText(result: string, keyword: RegExp): string | null {
  const heading = /\*\*(.+?)\*\*/;
  const lines = result.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].match(heading);
    if (!head || !keyword.test(head[1])) continue;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length && !heading.test(lines[j]); j++) {
      const t = lines[j].replace("→", "").trim();
      if (t) body.push(t);
    }
    return body.join("\n") || null;
  }
  return null;
}
