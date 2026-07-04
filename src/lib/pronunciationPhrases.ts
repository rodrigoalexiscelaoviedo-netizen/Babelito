export interface PronunciationPhrase {
  id: string;
  phrase: string;
  level: "A2" | "B1" | "B2";
  targetSound: string;
  difficulty: "easy" | "medium" | "hard";
}

export const PRONUNCIATION_PHRASES: PronunciationPhrase[] = [
  // A2 — th (voiced)
  { id: "a2-1", phrase: "The weather is getting better", level: "A2", targetSound: "th (voiced)", difficulty: "easy" },
  { id: "a2-2", phrase: "This and that are both good", level: "A2", targetSound: "th (voiced + unvoiced)", difficulty: "easy" },
  { id: "a2-3", phrase: "Think about the third thing", level: "A2", targetSound: "th (unvoiced)", difficulty: "easy" },
  // A2 — short vs long vowels
  { id: "a2-4", phrase: "He left his ship at the sheep farm", level: "A2", targetSound: "short vs long i", difficulty: "easy" },
  { id: "a2-5", phrase: "I want to live a long life", level: "A2", targetSound: "short vs long i", difficulty: "easy" },
  // B1 — th + r cluster
  { id: "b1-1", phrase: "The weather is rather unusual today", level: "B1", targetSound: "th + r", difficulty: "medium" },
  { id: "b1-2", phrase: "Three other brothers work together", level: "B1", targetSound: "th + r", difficulty: "medium" },
  // B1 — ng ending
  { id: "b1-3", phrase: "Working and thinking are tiring things", level: "B1", targetSound: "ng ending", difficulty: "medium" },
  { id: "b1-4", phrase: "Something interesting is happening", level: "B1", targetSound: "ng ending", difficulty: "medium" },
  // B1 — consonant clusters
  { id: "b1-5", phrase: "Strengths and strengths — it's a tricky word", level: "B1", targetSound: "consonant cluster str", difficulty: "medium" },
  { id: "b1-6", phrase: "She specifically asked for extra space", level: "B1", targetSound: "sp / sk / st clusters", difficulty: "medium" },
  // B2 — schwa + linking
  { id: "b2-1", phrase: "It was a matter of understanding each other", level: "B2", targetSound: "schwa + linking", difficulty: "hard" },
  { id: "b2-2", phrase: "I would have thought about it differently", level: "B2", targetSound: "weak forms + contractions", difficulty: "hard" },
  // B2 — word stress shift
  { id: "b2-3", phrase: "The record shows we record everything", level: "B2", targetSound: "noun vs verb stress", difficulty: "hard" },
  { id: "b2-4", phrase: "She objected to the object on the table", level: "B2", targetSound: "noun vs verb stress", difficulty: "hard" },
];

export function getPhrasesByLevel(level: "A2" | "B1" | "B2"): PronunciationPhrase[] {
  return PRONUNCIATION_PHRASES.filter((p) => p.level === level);
}
