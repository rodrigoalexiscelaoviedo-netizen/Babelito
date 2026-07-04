import { askCoach } from "./claude";

export interface WordDefinition {
  definition_es: string;
  definition_en: string;
  example: string;
  phonetic: string;
}

const SYSTEM = `You are an English dictionary for Spanish-speaking students.
For the given word respond ONLY with a single valid JSON object, no markdown, no extra text:
{"definition_es":"...","definition_en":"...","example":"...","phonetic":"..."}
Where phonetic uses IPA notation between forward slashes, e.g. /wɜːd/. Keep definitions brief (1 sentence each).`;

export async function lookupWord(word: string): Promise<WordDefinition> {
  try {
    const raw = await askCoach({
      system: SYSTEM,
      messages: [{ role: "user", content: word.toLowerCase().trim() }],
      maxTokens: 200,
      temperature: 0.1,
    });
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found");
    return JSON.parse(cleaned.slice(start, end + 1)) as WordDefinition;
  } catch {
    return {
      definition_es: "No disponible",
      definition_en: "Definition unavailable",
      example: "",
      phonetic: "",
    };
  }
}
