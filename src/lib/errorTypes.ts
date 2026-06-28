// Catálogo de tipos de error. El coach los devuelve por su `key`;
// acá mapeamos a etiqueta legible + pista de drill.

export interface ErrorTypeMeta {
  key: string;
  label: string;
  hint: string;
}

export const ERROR_TYPES: Record<string, ErrorTypeMeta> = {
  omitting_subject: {
    key: "omitting_subject",
    label: "Sujeto omitido",
    hint: "En inglés el sujeto casi nunca se omite: 'Is possible' → 'It is possible'.",
  },
  missing_to: {
    key: "missing_to",
    label: "Falta 'to'",
    hint: "Tras need/want/like + verbo va 'to': 'I need learn' → 'I need to learn'.",
  },
  missing_to_listen: {
    key: "missing_to_listen",
    label: "'listen' + to",
    hint: "Se escucha algo CON 'to': 'I listen music' → 'I listen to music'.",
  },
  adjective_plural: {
    key: "adjective_plural",
    label: "Adjetivo en plural",
    hint: "Los adjetivos no pluralizan: 'differents' → 'different'.",
  },
  false_friend: {
    key: "false_friend",
    label: "Falso amigo",
    hint: "'actually' = en realidad, no 'actualmente' (currently).",
  },
  meal_verb: {
    key: "meal_verb",
    label: "Verbo con comidas",
    hint: "Las comidas se 'have': 'go to make breakfast' → 'have breakfast'.",
  },
  word_order: {
    key: "word_order",
    label: "Orden de palabras",
    hint: "El inglés es bastante fijo: sujeto + verbo + objeto.",
  },
  verb_tense: {
    key: "verb_tense",
    label: "Tiempo verbal",
    hint: "Ojo con present perfect vs past simple.",
  },
  preposition: {
    key: "preposition",
    label: "Preposición",
    hint: "Las preposiciones rara vez se traducen literal del español.",
  },
  article: {
    key: "article",
    label: "Artículos",
    hint: "Cuándo usar a/an/the y cuándo nada.",
  },
  other: {
    key: "other",
    label: "Otro",
    hint: "Revisalo con el coach.",
  },
};

export function errorLabel(key: string): string {
  return ERROR_TYPES[key]?.label ?? key;
}

export function errorHint(key: string): string {
  return ERROR_TYPES[key]?.hint ?? "";
}
