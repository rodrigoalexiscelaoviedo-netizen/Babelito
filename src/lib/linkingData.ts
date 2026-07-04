export type LinkingType = "contraction" | "linking" | "reduction" | "elision" | "assimilation";

export interface LinkingPattern {
  id: string;
  type: LinkingType;
  written: string;
  spoken: string;
  explanationEs: string;
  distractors: string[];
}

export const TYPE_LABELS: Record<LinkingType, string> = {
  contraction: "Contractions",
  linking: "Linking",
  reduction: "Reductions",
  elision: "Elision",
  assimilation: "Assimilation",
};

export const TYPE_DESCRIPTIONS: Record<LinkingType, string> = {
  contraction: "Dos palabras se funden en una forma más corta",
  linking: "Una consonante final se pega a la vocal siguiente",
  reduction: "Palabras átonas se reducen o desaparecen",
  elision: "Un sonido desaparece completamente del habla rápida",
  assimilation: "Un sonido cambia por influencia del sonido vecino",
};

export const PATTERNS: LinkingPattern[] = [
  // ── Contractions ─────────────────────────────────────────────────────────
  {
    id: "wanna",
    type: "contraction",
    written: "I want to go.",
    spoken: "I wanna go.",
    explanationEs: "'want to' se funde en 'wanna' en el habla rápida e informal.",
    distractors: ["I would go.", "I went to go."],
  },
  {
    id: "gonna",
    type: "contraction",
    written: "We are going to be late.",
    spoken: "We're gonna be late.",
    explanationEs: "'going to' se convierte en 'gonna'; también 'are' se contrae en 're.",
    distractors: ["We were going to be late.", "We can be late."],
  },
  {
    id: "gotta",
    type: "contraction",
    written: "I have got to leave now.",
    spoken: "I gotta leave now.",
    explanationEs: "'got to' se funde en 'gotta' y la 'h' de 'have' desaparece.",
    distractors: ["I want to leave now.", "I need to go home."],
  },
  {
    id: "gimme",
    type: "contraction",
    written: "Can you give me a hand?",
    spoken: "Can you gimme a hand?",
    explanationEs: "'give me' se contrae en 'gimme'; la 'v' y 'e' desaparecen.",
    distractors: ["Can you get me a hand?", "Can you show me a hand?"],
  },
  {
    id: "lemme",
    type: "contraction",
    written: "Let me think about it.",
    spoken: "Lemme think about it.",
    explanationEs: "'let me' se contrae en 'lemme'; la 't' y espacio desaparecen.",
    distractors: ["Let's think about it.", "Leave me think about it."],
  },

  // ── Linking ───────────────────────────────────────────────────────────────
  {
    id: "an-apple",
    type: "linking",
    written: "She ate an apple.",
    spoken: "She ate a-napple.",
    explanationEs: "La 'n' de 'an' se pega a 'apple', sonando como una sola palabra 'anapple'.",
    distractors: ["She ate a mango.", "She had an apple pie."],
  },
  {
    id: "pick-it-up",
    type: "linking",
    written: "Can you pick it up?",
    spoken: "Can you pic-ki-tup?",
    explanationEs: "Las consonantes finales se pegan a las vocales siguientes: 'pick-it-up' suena continuo.",
    distractors: ["Can you pick it out?", "Can you put it up?"],
  },
  {
    id: "turn-it-off",
    type: "linking",
    written: "Please turn it off.",
    spoken: "Please tur-ni-toff.",
    explanationEs: "'turn', 'it' y 'off' se encadenan: la 'n' de turn y la 't' de it se pegan a las vocales.",
    distractors: ["Please turn it on.", "Please turn it down."],
  },
  {
    id: "not-at-all",
    type: "linking",
    written: "Not at all.",
    spoken: "No-ta-tall.",
    explanationEs: "'not', 'at', 'all' se encadenan formando casi una sola palabra continua.",
    distractors: ["Not at once.", "Now and then."],
  },

  // ── Reductions ────────────────────────────────────────────────────────────
  {
    id: "and-n",
    type: "reduction",
    written: "bread and butter",
    spoken: "bread 'n butter",
    explanationEs: "'and' se reduce a solo 'n', casi inaudible entre dos sustantivos.",
    distractors: ["bread or butter", "bread with butter"],
  },
  {
    id: "for-fer",
    type: "reduction",
    written: "I'll do it for you.",
    spoken: "I'll do it fer you.",
    explanationEs: "'for' pierde la 'o' tónica y se convierte en 'fer' (schwa) en frases sin énfasis.",
    distractors: ["I'll do it from you.", "I'll do it with you."],
  },
  {
    id: "comfortable",
    type: "reduction",
    written: "This sofa is very comfortable.",
    spoken: "This sofa is very comftable.",
    explanationEs: "'comfortable' pierde la sílaba central 'or', pasando de 4 a 3 sílabas: 'comf-ta-ble'.",
    distractors: ["This sofa is very common.", "This sofa is very comforting."],
  },
  {
    id: "of-a",
    type: "reduction",
    written: "kind of a mess",
    spoken: "kinda mess",
    explanationEs: "'kind of a' se reduce a 'kinda'; 'of a' casi desaparece en el habla rápida.",
    distractors: ["kind of messy", "some kind of mess"],
  },

  // ── Elision ───────────────────────────────────────────────────────────────
  {
    id: "next-day",
    type: "elision",
    written: "See you next day.",
    spoken: "See you nex' day.",
    explanationEs: "La 't' final de 'next' desaparece antes de una consonante: 'nex' day'.",
    distractors: ["See you next week.", "See you any day."],
  },
  {
    id: "most-common",
    type: "elision",
    written: "It's the most common mistake.",
    spoken: "It's the mos' common mistake.",
    explanationEs: "La 't' de 'most' desaparece antes de la consonante 'c' de 'common'.",
    distractors: ["It's the more common mistake.", "It's the least common mistake."],
  },
  {
    id: "last-night",
    type: "elision",
    written: "I called you last night.",
    spoken: "I called you las' night.",
    explanationEs: "La 't' final de 'last' desaparece ante 'n'; es común en cadenas consonánticas.",
    distractors: ["I called you last week.", "I texted you last night."],
  },

  // ── Assimilation ─────────────────────────────────────────────────────────
  {
    id: "doncha",
    type: "assimilation",
    written: "Don't you think so?",
    spoken: "Doncha think so?",
    explanationEs: "'don't you' → 'doncha': la 't' y 'y' se fusionan en el sonido 'ch'.",
    distractors: ["Do you think so?", "Doesn't it seem so?"],
  },
  {
    id: "wouldja",
    type: "assimilation",
    written: "Would you like some?",
    spoken: "Wouldja like some?",
    explanationEs: "'would you' → 'wouldja': la 'd' y 'y' se fusionan en el sonido 'dj'.",
    distractors: ["Will you like some?", "Could you like some?"],
  },
  {
    id: "gotcha",
    type: "assimilation",
    written: "I've got you now.",
    spoken: "I've gotcha now.",
    explanationEs: "'got you' → 'gotcha': la 't' y 'y' se fusionan en 'ch', exactamente como 'gotcha'.",
    distractors: ["I've lost you now.", "I've got it now."],
  },
];

export const ALL_TYPES: LinkingType[] = [
  "contraction",
  "linking",
  "reduction",
  "elision",
  "assimilation",
];
