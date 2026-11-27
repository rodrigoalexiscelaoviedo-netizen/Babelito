// Catálogo de tipos de error. El coach los devuelve por su `key`;
// aquí mapeamos a etiqueta legible + pista de drill, en inglés y en catalán.

export interface ErrorTypeMeta {
  key: string;
  label: string;
  hint: string;
}

export const ERROR_TYPES: Record<string, ErrorTypeMeta> = {
  omitting_subject: {
    key: "omitting_subject",
    label: "Omitted subject",
    hint: "In English the subject is almost never omitted: 'Is possible' → 'It is possible'.",
  },
  missing_to: {
    key: "missing_to",
    label: "Missing 'to'",
    hint: "After need / want / like + verb, use 'to': 'I need learn' → 'I need to learn'.",
  },
  missing_to_listen: {
    key: "missing_to_listen",
    label: "'listen' + to",
    hint: "You listen TO something: 'I listen music' → 'I listen to music'.",
  },
  adjective_plural: {
    key: "adjective_plural",
    label: "Plural adjective",
    hint: "Adjectives don't take plurals: 'differents' → 'different'.",
  },
  false_friend: {
    key: "false_friend",
    label: "False friend",
    hint: "'actually' means 'in fact', not 'currently' (actualmente).",
  },
  meal_verb: {
    key: "meal_verb",
    label: "Verb with meals",
    hint: "Meals go with 'have': 'make breakfast' → 'have breakfast'.",
  },
  word_order: {
    key: "word_order",
    label: "Word order",
    hint: "English is quite fixed: subject + verb + object.",
  },
  verb_tense: {
    key: "verb_tense",
    label: "Verb tense",
    hint: "Watch out for present perfect vs past simple.",
  },
  preposition: {
    key: "preposition",
    label: "Preposition",
    hint: "Prepositions rarely translate word for word from Spanish.",
  },
  article: {
    key: "article",
    label: "Articles",
    hint: "When to use a / an / the, and when to use none.",
  },
  other: {
    key: "other",
    label: "Other",
    hint: "Review it with your coach.",
  },
};

/**
 * Mismas claves que el coach devuelve en catalán (<<ERRORS: ...>>), con etiquetas
 * y pistas pensadas para quien ya habla castellano y aprende català.
 */
export const ERROR_TYPES_CA: Record<string, ErrorTypeMeta> = {
  omitting_subject: { key: "omitting_subject", label: "Pronom subjecte", hint: "Els pronoms de subjecte es poden callar, però cal fixar-se en qui fa l'acció quan no és clar." },
  missing_to: { key: "missing_to", label: "Preposició després d'un verb", hint: "Tenir ganes de, haver de, acabar de: cada verb porta la seva preposició." },
  missing_to_listen: { key: "missing_to_listen", label: "Verb amb o sense preposició", hint: "Escoltar música no porta preposició; pensar en sí." },
  adjective_plural: { key: "adjective_plural", label: "Concordança de l'adjectiu", hint: "L'adjectiu concorda en gènere i nombre: una casa bonica, uns nois alts." },
  false_friend: { key: "false_friend", label: "Castellanisme", hint: "Vaso és got, pollo és pollastre, coger és agafar." },
  meal_verb: { key: "meal_verb", label: "Verb amb menjars", hint: "Es diu dinar, esmorzar o sopar, i fer el dinar." },
  word_order: { key: "word_order", label: "Ordre dels pronoms", hint: "Els pronoms febles (el, la, en, hi) van davant del verb: el veig, en tinc." },
  verb_tense: { key: "verb_tense", label: "Temps verbal o ser/estar", hint: "Ser per a què és algú; estar per a com està o on és. Ahir vaig anar, no he anat." },
  preposition: { key: "preposition", label: "Preposició", hint: "A les cinc, al maig, a Girona, per a tu: les preposicions no són les del castellà." },
  article: { key: "article", label: "Article", hint: "El, la, l', els, les; davant de vocal, l'. L'aigua, no el aigua." },
  other: { key: "other", label: "Altre", hint: "Revisa-ho amb el coach." },
};

/** Tipos que se registran pero no son de gramática (no tienen lección). */
const NON_GRAMMAR: Record<"en" | "ca", Record<string, { label: string; hint: string }>> = {
  en: { pronunciation_error: { label: "Pronunciation", hint: "Sounds your coach flagged when you spoke. Train them in Pronunciation." } },
  ca: { pronunciation_error: { label: "Pronunciació", hint: "Sons que el coach ha marcat quan parlaves. Entrena'ls a Pronunciació." } },
};

export function errorLabel(key: string, lang: "en" | "ca" = "en"): string {
  const table = lang === "ca" ? ERROR_TYPES_CA : ERROR_TYPES;
  return table[key]?.label ?? NON_GRAMMAR[lang][key]?.label ?? key;
}

export function errorHint(key: string, lang: "en" | "ca" = "en"): string {
  const table = lang === "ca" ? ERROR_TYPES_CA : ERROR_TYPES;
  return table[key]?.hint ?? NON_GRAMMAR[lang][key]?.hint ?? "";
}
