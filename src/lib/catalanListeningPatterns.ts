/**
 * 10 listening patterns catalanes — hardcoded en TS, no BD
 * Patrons de pronunciació i elisió comuns que el learner ha de reconèixer
 */

export interface ListeningPattern {
  id: string;
  pattern: string;
  catalan_example: string;
  phonetic: string;
  explanation: string;
  exercise_word_pairs: Array<Record<string, any>>;
}

export const catalanListeningPatterns: ListeningPattern[] = [
  {
    id: "cat_listening_001",
    pattern: "Linking vowel + vowel",
    catalan_example: "de aquí",
    phonetic: "/d·ə'a'ki/ → /də'ˑki/",
    explanation:
      "Cuando una palabra termina en vocal y la siguiente empieza en vocal, las vocales se funden.",
    exercise_word_pairs: [
      { slow: "de aquí", fast: "d'aquí", meaning: "de aquí (from here)" },
      { slow: "que és", fast: "qu'és", meaning: "que és (that is)" },
      {
        slow: "he anat",
        fast: "h'anat",
        meaning: "he anat (I've gone)",
      },
    ],
  },
  {
    id: "cat_listening_002",
    pattern: "Consonant + h silent",
    catalan_example: "he anat",
    phonetic: "/ə'anat/ (h is silent)",
    explanation:
      "La 'h' en català NO se pronuncia; es silent. Es fácil pensar que sí.",
    exercise_word_pairs: [
      {
        wrong: "h-e anat",
        correct: "'e anat",
        meaning: "he anat (I've gone)",
      },
      {
        wrong: "h-abia",
        correct: "'avia",
        meaning: "havia (I had)",
      },
    ],
  },
  {
    id: "cat_listening_003",
    pattern: "Schwa reduction in unstressed syllables",
    catalan_example: "una casa bonita",
    phonetic: "/ˈunə ˈkazə bəˈnita/",
    explanation:
      "Las sílabas átonas se reducen casi a 'ə'. 'casa' sounds like 'ká-sə', not 'KA-sa'.",
    exercise_word_pairs: [
      {
        stressed: "CÁ-sa",
        fast: "kə",
        meaning: "La casa és gran",
      },
    ],
  },
  {
    id: "cat_listening_004",
    pattern: "Elision of vowels",
    catalan_example: "que és",
    phonetic: "/kəˈɛs/",
    explanation:
      "Las vocales átonas al final de word often disappear en fast speech.",
    exercise_word_pairs: [
      { slow: "que és", fast: "qu'és", meaning: "that is" },
      { slow: "tot home", fast: "tot'hom", meaning: "every man" },
    ],
  },
  {
    id: "cat_listening_005",
    pattern: "Gemination (double consonant)",
    catalan_example: "a Barcelona",
    phonetic: "/ə barθəˈlonə/",
    explanation:
      "Dos consonantes iguals entre dos sílabas se pronuncian como una única consonante larga.",
    exercise_word_pairs: [
      {
        single: "a Barcelona",
        fast: "a Barcelona",
        note: "the 'l' is held longer",
      },
    ],
  },
  {
    id: "cat_listening_006",
    pattern: "Voicing assimilation",
    catalan_example: "tot dia",
    phonetic: "/ˈtɔd ˈdiə/",
    explanation:
      "La 't' final (sorda) se vuelve 'd' (sonora) ante vocal sonora.",
    exercise_word_pairs: [
      { slow: "tot + dia", fast: "tod dia", meaning: "all day" },
      {
        slow: "tot + home",
        fast: "tot home",
        meaning: "every man (no change)",
      },
    ],
  },
  {
    id: "cat_listening_007",
    pattern: "Nasal assimilation",
    catalan_example: "em dic",
    phonetic: "/əm ˈdik/",
    explanation:
      "La 'n' final se adapta al punto de articulación del siguiente sonido.",
    exercise_word_pairs: [
      { before_b: "em dic", nasal: "m", meaning: "I'm called" },
      {
        before_k: "en construcció",
        nasal: "n",
        meaning: "in construction",
      },
    ],
  },
  {
    id: "cat_listening_008",
    pattern: "Palatal softening",
    catalan_example: "necia (silly woman)",
    phonetic: "/nəˈsiə/",
    explanation:
      "La 'c' antes de 'e' o 'i' se vuelve 's' (o más fricativa).",
    exercise_word_pairs: [
      {
        c_hard: "casa",
        c_soft: "cerca",
        meaning: "house vs. near",
      },
    ],
  },
  {
    id: "cat_listening_009",
    pattern: "Word-boundary fusion",
    catalan_example: "poma i pera",
    phonetic: "/ˈpɔmə i ˈpɛɾə/",
    explanation:
      "Las palabra se unen en habla rápida; es difícil saber dónde termina una y empieza otra.",
    exercise_word_pairs: [
      {
        separate: "poma i pera",
        fast: "pomipéra",
        meaning: "apple and pear",
      },
    ],
  },
  {
    id: "cat_listening_010",
    pattern: "Deletion of intervocal consonants",
    catalan_example: "la idea",
    phonetic: "/ləˈidea/ (sometimes /ləˈidea/)",
    explanation:
      "Algunos consonantes intervocales pueden desaparecer en habla rápida.",
    exercise_word_pairs: [
      {
        with: "la idea",
        fast: "la idea",
        note: "sometimes the 'd' is weak",
      },
    ],
  },
];
