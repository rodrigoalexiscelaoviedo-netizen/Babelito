/**
 * Parser único para respuestas JSON de la IA.
 *
 * Los modelos a veces envuelven el JSON en ```json, agregan texto antes o
 * después, dejan comas finales o usan comillas tipográficas. Antes cada módulo
 * tenía su propia copia frágil de este código; ahora hay una sola, probada.
 */

/** Quita bloques de código markdown (```json … ```). */
function stripFences(raw: string): string {
  return raw.replace(/```(?:json)?/gi, "").trim();
}

/** Corrige errores comunes que invalidan el JSON sin cambiar su contenido. */
function repair(json: string): string {
  return json
    .replace(/[“”]/g, '"') // comillas tipográficas dobles
    .replace(/,\s*([}\]])/g, "$1"); // comas finales
}

/** Extrae el primer objeto JSON ({...}) balanceado del texto, o null. */
function extractObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // sin cierre: respuesta truncada
}

/**
 * Convierte la respuesta de la IA en un objeto. Lanza Error con un mensaje
 * claro si no hay JSON o está truncado (así la UI puede mostrar "intenta otra vez").
 */
export function parseAiJson<T>(raw: string): T {
  const text = stripFences(raw);
  const candidate = extractObject(text);
  if (!candidate) throw new Error("La IA no devolvió un JSON completo.");
  try {
    return JSON.parse(candidate) as T;
  } catch {
    try {
      return JSON.parse(repair(candidate)) as T;
    } catch {
      throw new Error("La IA devolvió un JSON inválido.");
    }
  }
}

/** Igual que parseAiJson pero devuelve null en vez de lanzar. */
export function tryParseAiJson<T>(raw: string): T | null {
  try {
    return parseAiJson<T>(raw);
  } catch {
    return null;
  }
}
