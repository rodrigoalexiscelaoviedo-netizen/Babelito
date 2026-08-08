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
      "Quan una paraula termina en vocal i la següent comença en vocal, les vocals es fusionen.",
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
      "La 'h' en català NO es pronuncia; és silent. És fàcil pensar que sí.",
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
      "Les síl·labes àtones es redueixen quasi a 'ə'. 'casa' sona com 'ká-sə', no 'KA-sa'.",
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
      "Les vocals àtones al final de paraula sovint desapareixen en parla ràpida.",
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
      "Dos consonants iguals entre dues síl·labes es pronuncien com una única consonant llarga.",
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
      "La 't' final (sorda) es veu 'd' (sonora) davant vocal sonora.",
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
      "La 'n' final s'adapta al punt d'articulació del següent so.",
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
      "La 'c' davant 'e' o 'i' es veu 's' (o més fricativa).",
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
      "Les paraules es fusionen en parla ràpida; és difícil saber on termina una i comença altra.",
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
      "Alguns consonants intervocàlics poden desaparèixer en parla ràpida.",
    exercise_word_pairs: [
      {
        with: "la idea",
        fast: "la idea",
        note: "sometimes the 'd' is weak",
      },
    ],
  },
];
