/**
 * Temas de conversación. Única fuente de verdad: los usan la pantalla de
 * Conversación (temas fijos), la práctica diaria (tema del día) y los tests,
 * que garantizan que cada tema tenga su pregunta de apertura.
 */
export type TopicLang = "en" | "ca";

/** Los 5 temas que se ofrecen al abrir la conversación. */
export const PICKER_TOPICS: Record<TopicLang, string[]> = {
  en: ["Your work", "Your weekend", "A goal you have", "Something you enjoy", "Free chat"],
  ca: ["El teu treball", "El teu cap de setmana", "Un objectiu que tens", "Quelcom que gaudixis", "Xat lliure"],
};

/** Temas que rota la práctica diaria. */
export const DAILY_TOPICS: Record<TopicLang, string[]> = {
  en: [
    "Your morning routine",
    "A hobby you enjoy",
    "Your favourite place to visit",
    "How technology affects your life",
    "A book or film you liked recently",
    "Your goals for this month",
    "A challenge you overcame",
    "What you find most interesting about your job",
  ],
  ca: [
    "La teva rutina del matí",
    "Un lloc que t'agrada de Barcelona",
    "El que has fet aquest cap de setmana",
    "Una afició teva",
    "El teu barri",
    "Menjar que t'agrada cuinar",
    "Un repte que has superat",
    "La teva família i els teus amics",
  ],
};

export const FREE_CHAT: Record<TopicLang, string> = { en: "Free chat", ca: "Xat lliure" };

export function allTopics(lang: TopicLang): string[] {
  return [...PICKER_TOPICS[lang], ...DAILY_TOPICS[lang]];
}
