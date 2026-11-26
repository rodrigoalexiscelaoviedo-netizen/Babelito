/**
 * Ayudas en pantalla durante la llamada: ideas para responder y traducción.
 * Van por el coach de texto, así no interrumpen la voz.
 */
import { askCoach } from "./claude";
import { tryParseAiJson } from "./json";

export interface Suggestion {
  en: string;
  es: string;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseSuggestions(raw: string): Suggestion[] {
  const data = tryParseAiJson<{ replies?: unknown }>(raw);
  if (!Array.isArray(data?.replies)) return [];
  return (data.replies as Array<Record<string, unknown>>)
    .map((r) => ({ en: str(r?.en, 160), es: str(r?.es, 160) }))
    .filter((r) => r.en)
    .slice(0, 3);
}

export async function suggestReplies(coachLine: string, level: string): Promise<Suggestion[]> {
  const raw = await askCoach({
    json: true,
    system:
      `A Spanish speaker learning English at CEFR level ${level} is on a voice call and doesn't know how to answer. ` +
      "Give 3 different short replies they could say, at their level, from simplest to richest. Where personal details are needed, keep them generic and easy to swap. " +
      'Reply ONLY with JSON: {"replies":[{"en":"reply in English","es":"meaning in neutral Spanish"}]}',
    messages: [{ role: "user", content: `The other person just said: "${coachLine.slice(-600)}"` }],
    maxTokens: 400,
    temperature: 0.6,
  });
  return parseSuggestions(raw);
}

export async function translateToSpanish(text: string): Promise<string> {
  const raw = await askCoach({
    system: "Translate what the user sends from English to natural neutral Spanish. Reply with the translation only.",
    messages: [{ role: "user", content: text.slice(-1200) }],
    maxTokens: 500,
    temperature: 0.2,
  });
  return raw.trim();
}

// ── Preferencias de la llamada (solo en este dispositivo) ────────────────────────

export interface LivePrefs {
  correction: "gentle" | "balanced" | "strict";
  captions: boolean;
}

const KEY = "babelito:live-prefs";
const DEFAULTS: LivePrefs = { correction: "balanced", captions: true };

export function loadLivePrefs(): LivePrefs {
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<LivePrefs> | null;
    return {
      correction: p?.correction === "gentle" || p?.correction === "strict" ? p.correction : DEFAULTS.correction,
      captions: typeof p?.captions === "boolean" ? p.captions : DEFAULTS.captions,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveLivePrefs(prefs: LivePrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* sin almacenamiento: valen para esta sesión */
  }
}
