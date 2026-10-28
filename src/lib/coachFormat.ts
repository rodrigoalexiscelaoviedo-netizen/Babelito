/**
 * Formato de las respuestas del coach en la conversación.
 *
 * Antes cada respuesta era un bloque largo mezclando lo que el coach DICE con
 * el feedback sobre tu mensaje (corrección, tip, pronunciación). Ahora el prompt
 * separa ambas cosas con un delimitador:
 *
 *   <respuesta natural + una pregunta>
 *   ---FEEDBACK---
 *   **Correction:** ...
 *   **Key tip:** ...
 *
 * Así la conversación se lee como una conversación y el feedback queda en una
 * tarjeta aparte. Las sesiones guardadas con el formato viejo (sin delimitador)
 * se siguen mostrando como antes (`legacy`).
 */

export const FEEDBACK_DELIMITER = "---FEEDBACK---";

export interface FeedbackSection {
  title: string;
  lines: string[];
}

export interface CoachReply {
  /** Lo que el coach dice: reacción + pregunta de seguimiento. */
  talk: string;
  feedback: FeedbackSection[];
  /** true si es una respuesta con el formato antiguo: se muestra entera, sin separar. */
  legacy: boolean;
}

const HEADING = /^\s*\*\*(.+?)\*\*\s*:?\s*(.*)$/;

function cleanLine(line: string): string {
  return line.replace(/^\s*(?:→|->|[-•*])\s*/, "").trim();
}

/** Quita etiquetas que el modelo a veces copia del prompt: "Part 1 — THE CONVERSATION". */
const PART_LABEL = /^\s*(?:\*\*)?\s*part\s*\d\b/i;

function stripPartLabels(text: string): string {
  return text
    .split("\n")
    .filter((l) => !PART_LABEL.test(l))
    .join("\n")
    .trim();
}

function parseSections(block: string): FeedbackSection[] {
  const sections: FeedbackSection[] = [];
  let current: FeedbackSection | null = null;

  for (const raw of block.split("\n")) {
    if (PART_LABEL.test(raw)) continue;
    const m = raw.match(HEADING);
    if (m) {
      const title = m[1].replace(/[:：]\s*$/, "").trim();
      // El modelo a veces repite el encabezado en cada línea (p. ej. varias "Pronunciation"):
      // se juntan en una sola sección en vez de mostrar títulos duplicados.
      const existing = sections.find((sec) => sec.title.toLowerCase() === title.toLowerCase());
      current = existing ?? { title, lines: [] };
      if (!existing) sections.push(current);
      const inline = cleanLine(m[2]);
      if (inline) current.lines.push(inline);
      continue;
    }
    const line = cleanLine(raw);
    if (line && current) current.lines.push(line);
  }
  return sections.filter((sec) => sec.lines.length > 0);
}

export function splitCoachReply(text: string): CoachReply {
  const trimmed = text.trim();
  const at = trimmed.indexOf(FEEDBACK_DELIMITER);

  if (at >= 0) {
    return {
      talk: stripPartLabels(trimmed.slice(0, at)),
      feedback: parseSections(trimmed.slice(at + FEEDBACK_DELIMITER.length)),
      legacy: false,
    };
  }

  // Formato antiguo: encabezados **…** mezclados con la charla.
  if (/^\s*\*\*.+\*\*/m.test(trimmed)) {
    return { talk: trimmed, feedback: [], legacy: true };
  }

  return { talk: stripPartLabels(trimmed), feedback: [], legacy: false };
}

export interface PronunciationEntry {
  word: string;
  ipa: string;
  phrase: string;
}

/** "beach /biːtʃ/ — Big beach trip" → { word, ipa, phrase }. null si no tiene IPA. */
export function parsePronunciationLine(line: string): PronunciationEntry | null {
  const m = line.match(/^["'“”]?(.+?)["'“”]?\s+(\/[^/]+\/)\s*(?:[—–-]\s*)?(.*)$/);
  if (!m) return null;
  return { word: m[1].trim(), ipa: m[2], phrase: m[3].trim() };
}

export type FeedbackKind = "correction" | "natural" | "variant" | "tip" | "pronunciation" | "other";

export function feedbackKind(title: string): FeedbackKind {
  const t = title.toLowerCase();
  if (/pronun/.test(t)) return "pronunciation";
  if (/natural|natur/.test(t)) return "natural";
  if (/correct|correcci/.test(t)) return "correction";
  if (/tip|consejo|consell|truco/.test(t)) return "tip";
  if (/british|american|version|versió|versión/.test(t)) return "variant";
  return "other";
}

/** Texto para leer en voz alta o usar como contexto: solo lo que el coach dice. */
export function spokenPart(text: string): string {
  const r = splitCoachReply(text);
  return r.legacy ? text : r.talk;
}
