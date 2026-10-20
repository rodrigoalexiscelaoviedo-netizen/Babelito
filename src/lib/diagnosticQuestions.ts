import type { Level } from "./types";

export interface DiagnosticQuestion {
  id: number;
  level: Level;
  prompt: string;
  options: string[];
  answer: number; // índice correcto
  skill: "grammar" | "vocab" | "usage";
}

// 16 preguntas graduadas A1 → C1. El scoring estima nivel por el escalón
// más alto que el usuario sostiene bien, no por el total bruto.
export const DIAGNOSTIC: DiagnosticQuestion[] = [
  { id: 1, level: "A1", skill: "grammar", prompt: "She ___ from Spain.", options: ["am", "is", "are", "be"], answer: 1 },
  { id: 2, level: "A1", skill: "vocab", prompt: "What's the opposite of 'big'?", options: ["tall", "small", "long", "wide"], answer: 1 },
  { id: 3, level: "A1", skill: "grammar", prompt: "They ___ to the cinema yesterday.", options: ["go", "goes", "went", "going"], answer: 2 },
  { id: 4, level: "A2", skill: "grammar", prompt: "I ___ to learn English.", options: ["need", "need to", "needs", "needing"], answer: 1 },
  { id: 5, level: "A2", skill: "usage", prompt: "Choose the natural sentence:", options: ["I listen music every day.", "I listen to music every day.", "I listen the music every day.", "I hear to music every day."], answer: 1 },
  { id: 6, level: "A2", skill: "vocab", prompt: "We usually ___ breakfast at 8.", options: ["do", "make", "have", "take"], answer: 2 },
  { id: 7, level: "B1", skill: "grammar", prompt: "If I ___ more time, I would travel.", options: ["have", "had", "will have", "would have"], answer: 1 },
  { id: 8, level: "B1", skill: "usage", prompt: "'Actually' in English means:", options: ["currently / nowadays", "in fact / really", "actively", "at the moment"], answer: 1 },
  { id: 9, level: "B1", skill: "grammar", prompt: "I've lived here ___ 2019.", options: ["for", "since", "during", "from"], answer: 1 },
  { id: 10, level: "B1", skill: "vocab", prompt: "Pick the most natural: 'Let me ___ you through the numbers.'", options: ["walk", "pass", "drive", "go"], answer: 0 },
  { id: 11, level: "B2", skill: "grammar", prompt: "By next year, I ___ here for a decade.", options: ["will work", "will be working", "will have worked", "work"], answer: 2 },
  { id: 12, level: "B2", skill: "usage", prompt: "Most natural in a meeting:", options: ["I want that you do this.", "I'd like you to handle this.", "I want you do this.", "I like you do this."], answer: 1 },
  { id: 13, level: "B2", skill: "vocab", prompt: "'To chase up on something' means to:", options: ["abandon it", "follow up / remind", "speed up", "cancel"], answer: 1 },
  { id: 14, level: "C1", skill: "grammar", prompt: "___ harder, she would have passed.", options: ["If she studied", "Had she studied", "She had studied", "Did she study"], answer: 1 },
  { id: 15, level: "C1", skill: "usage", prompt: "Choose the idiomatic option:", options: ["At the end of the day, results matter.", "In the end of the day, results matter.", "At the final of the day, results matter.", "By the end of day, results matter."], answer: 0 },
  { id: 16, level: "C1", skill: "vocab", prompt: "A 'fair point' is something:", options: ["completely wrong", "reasonable / valid", "unfair", "boring"], answer: 1 },
];

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/**
 * Estima el nivel: arranca asumiendo el más bajo y "promociona" mientras
 * el usuario mantenga >=60% de acierto en cada escalón. Se frena en el
 * primer escalón que no sostiene.
 */
export function estimateLevel(correctByLevel: Record<Level, { correct: number; total: number }>): Level {
  let result: Level = "A1";
  for (const lvl of LEVEL_ORDER) {
    const bucket = correctByLevel[lvl];
    if (!bucket || bucket.total === 0) continue;
    const ratio = bucket.correct / bucket.total;
    if (ratio >= 0.6) {
      result = lvl;
    } else {
      break;
    }
  }
  return result;
}

// ── Catalán ───────────────────────────────────────────────────────────────────
// Mismo esquema y niveles que DIAGNOSTIC. Antes Nadia (aprendiendo catalán)
// hacía el test en inglés: ahora hace uno en catalán.
export const DIAGNOSTIC_CA: DiagnosticQuestion[] = [
  { id: 1, level: "A1", skill: "grammar", prompt: "Ella ___ de Barcelona.", options: ["és", "ets", "sou", "són"], answer: 0 },
  { id: 2, level: "A1", skill: "vocab", prompt: "Quin és l'antònim de 'gran'?", options: ["alt", "petit", "llarg", "ample"], answer: 1 },
  { id: 3, level: "A1", skill: "grammar", prompt: "Ahir ___ al cinema.", options: ["vaig anar", "vaig anat", "anar", "vaig"], answer: 0 },
  { id: 4, level: "A2", skill: "grammar", prompt: "Jo ___ aprendre català.", options: ["vull", "vulc", "vol", "volen"], answer: 0 },
  { id: 5, level: "A2", skill: "usage", prompt: "Quina frase és natural?", options: ["Jo like el cafè molt.", "Em gusta molt el café.", "M'agrada molt el cafè.", "Sóc molt gust de cafè."], answer: 2 },
  { id: 6, level: "A2", skill: "vocab", prompt: "Ella ___ els ulls blaus.", options: ["té", "és", "fa", "va"], answer: 0 },
  { id: 7, level: "B1", skill: "grammar", prompt: "Si ___ més temps, viatjaria.", options: ["tingués", "tindria", "tinc", "tindré"], answer: 0 },
  { id: 8, level: "B1", skill: "usage", prompt: "'Doncs' en català sol significar:", options: ["encara", "llavors / per tant", "mai", "tanmateix"], answer: 1 },
  { id: 9, level: "B1", skill: "grammar", prompt: "Visc aquí ___ 2019.", options: ["des de", "durant", "des", "fa"], answer: 0 },
  { id: 10, level: "B1", skill: "vocab", prompt: "Ens hem ___ a les vuit al bar.", options: ["quedat", "trobat", "vist", "mirat"], answer: 0 },
  { id: 11, level: "B2", skill: "grammar", prompt: "Per l'any que ve, ja ___ aquí durant una dècada.", options: ["hauré treballat", "treballaré", "treballo", "treballava"], answer: 0 },
  { id: 12, level: "B2", skill: "usage", prompt: "En una reunió, la frase més natural és:", options: ["Vull que tu facis això.", "M'agradaria que t'encarreguessis d'això.", "Jo vull tu fer això.", "Vull que fas això."], answer: 1 },
  { id: 13, level: "B2", skill: "vocab", prompt: "'Fer un seguiment' vol dir:", options: ["abandonar-ho", "fer el seguiment / recordar", "accelerar", "cancel·lar"], answer: 1 },
  { id: 14, level: "C1", skill: "grammar", prompt: "Si hagués estudiat més, ___.", options: ["aprovaria", "hauria aprovat", "aproveria", "aprovés"], answer: 1 },
  { id: 15, level: "C1", skill: "grammar", prompt: "Espero que ___ bé el teu examen.", options: ["sortís", "sorti", "surti", "surtirà"], answer: 2 },
  { id: 16, level: "C1", skill: "vocab", prompt: "Una 'objecció justa' és una cosa:", options: ["completament errònia", "raonable / vàlida", "injusta", "avorrida"], answer: 1 },
];

/** Banco de preguntas según el idioma que se aprende. */
export function diagnosticFor(lang: "en" | "ca"): DiagnosticQuestion[] {
  return lang === "ca" ? DIAGNOSTIC_CA : DIAGNOSTIC;
}
