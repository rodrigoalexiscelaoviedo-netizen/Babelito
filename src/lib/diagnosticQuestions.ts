import type { Level } from "./types";

export interface DiagnosticQuestion {
  id: number;
  level: Level;
  prompt: string;
  options: string[];
  answer: number; // índice correcto
  skill: "grammar" | "vocab" | "usage";
}

/** Respuesta "No lo sé": cuenta como error, pero evita adivinar a ciegas. */
export const DONT_KNOW = -1;

const RANK: Record<Level, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 };

/** Ordena por nivel (estable) para que cada escalón sea contiguo en el test. */
function byLevel(list: DiagnosticQuestion[]): DiagnosticQuestion[] {
  return [...list].sort((a, b) => RANK[a.level] - RANK[b.level]);
}

// 26 preguntas graduadas A1 → C1 (5 por nivel). El scoring estima nivel por el
// escalón más alto que el usuario sostiene bien, no por el total bruto.
const DIAGNOSTIC_RAW: DiagnosticQuestion[] = [
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
  // Más preguntas por escalón: el nivel se estima con más evidencia y menos azar.
  { id: 17, level: "A1", skill: "grammar", prompt: "I ___ a student.", options: ["is", "am", "are", "be"], answer: 1 },
  { id: 18, level: "A1", skill: "vocab", prompt: "Hello! My ___ is Ana.", options: ["name", "called", "am", "age"], answer: 0 },
  { id: 19, level: "A2", skill: "grammar", prompt: "There ___ two books on the table.", options: ["is", "are", "has", "have"], answer: 1 },
  { id: 20, level: "A2", skill: "grammar", prompt: "She ___ TV every evening.", options: ["watch", "watches", "watching", "is watch"], answer: 1 },
  { id: 21, level: "B1", skill: "grammar", prompt: "I haven't finished my homework ___.", options: ["yet", "ago", "since", "during"], answer: 0 },
  { id: 22, level: "B1", skill: "usage", prompt: "He suggested ___ to the beach.", options: ["to go", "going", "go", "went"], answer: 1 },
  { id: 23, level: "B2", skill: "grammar", prompt: "She asked me where ___.", options: ["did I live", "I lived", "do I live", "I do live"], answer: 1 },
  { id: 24, level: "B2", skill: "usage", prompt: "I'm not used ___ up so early.", options: ["to get", "to getting", "getting", "for get"], answer: 1 },
  { id: 25, level: "C1", skill: "grammar", prompt: "Not only ___ late, but he also forgot the documents.", options: ["he arrived", "did he arrive", "he did arrive", "arrived he"], answer: 1 },
  { id: 26, level: "C1", skill: "vocab", prompt: "'Ubiquitous' means:", options: ["very rare", "found everywhere", "dangerous", "extremely old"], answer: 1 },
];

export const DIAGNOSTIC: DiagnosticQuestion[] = byLevel(DIAGNOSTIC_RAW);

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/**
 * Estima el nivel: arranca asumiendo el más bajo y "promociona" mientras
 * el usuario mantenga >=60% de acierto en cada escalón. Se frena en el
 * primer escalón que no sostiene.
 */
/**
 * ¿Hay que cortar el test aquí? Se corta al terminar un escalón si no se sostuvo
 * (menos del 60 % de aciertos): seguir con preguntas más difíciles solo frustra.
 */
export function levelFailed(answers: Array<{ level: Level; correct: boolean }>, level: Level): boolean {
  const bucket = answers.filter((a) => a.level === level);
  if (bucket.length === 0) return false;
  return bucket.filter((a) => a.correct).length / bucket.length < 0.6;
}

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

// ── Segunda oportunidad ───────────────────────────────────────────────────────
// Cada escalón se juzga con 5 preguntas: un 2 de 5 puede ser mala suerte y cortaba
// el test ahí. En ese caso exacto se hacen 3 preguntas más del mismo nivel y se
// decide con las 8 (hace falta 60 %, o sea 5 de 8).

const TIEBREAKERS_EN: Record<Level, DiagnosticQuestion[]> = {
  A1: [
    { id: 101, level: "A1", skill: "grammar", prompt: "My brother ___ two children.", options: ["have", "has", "is having", "haves"], answer: 1 },
    { id: 102, level: "A1", skill: "grammar", prompt: "___ you like coffee?", options: ["Does", "Do", "Are", "Is"], answer: 1 },
    { id: 103, level: "A1", skill: "vocab", prompt: "The opposite of 'hot' is:", options: ["cold", "tall", "new", "fast"], answer: 0 },
  ],
  A2: [
    { id: 104, level: "A2", skill: "grammar", prompt: "I ___ to the gym yesterday.", options: ["go", "went", "gone", "going"], answer: 1 },
    { id: 105, level: "A2", skill: "grammar", prompt: "She is taller ___ her sister.", options: ["that", "than", "then", "as"], answer: 1 },
    { id: 106, level: "A2", skill: "usage", prompt: "How ___ water do you drink every day?", options: ["many", "much", "few", "lot"], answer: 1 },
  ],
  B1: [
    { id: 107, level: "B1", skill: "grammar", prompt: "If I ___ more money, I would buy a bigger flat.", options: ["have", "had", "will have", "would have"], answer: 1 },
    { id: 108, level: "B1", skill: "grammar", prompt: "She has lived here ___ 2015.", options: ["for", "since", "during", "from"], answer: 1 },
    { id: 109, level: "B1", skill: "usage", prompt: "I'm looking forward ___ you next week.", options: ["to see", "to seeing", "seeing", "for see"], answer: 1 },
  ],
  B2: [
    { id: 110, level: "B2", skill: "grammar", prompt: "By the time we arrived, the film ___ already started.", options: ["has", "had", "was", "have"], answer: 1 },
    { id: 111, level: "B2", skill: "grammar", prompt: "The report ___ by the manager before the meeting.", options: ["wrote", "was written", "has wrote", "is writing"], answer: 1 },
    { id: 112, level: "B2", skill: "usage", prompt: "He denied ___ the window.", options: ["to break", "breaking", "break", "to have break"], answer: 1 },
  ],
  C1: [
    { id: 113, level: "C1", skill: "grammar", prompt: "Had I known about the delay, I ___ earlier.", options: ["would leave", "would have left", "will leave", "left"], answer: 1 },
    { id: 114, level: "C1", skill: "vocab", prompt: "The new policy has had a ___ effect on small businesses.", options: ["detrimental", "detrimentally", "detriment", "detrimented"], answer: 0 },
    { id: 115, level: "C1", skill: "vocab", prompt: "'To be on the fence' about something means:", options: ["to be undecided", "to be angry", "to be very sure", "to be tired"], answer: 0 },
  ],
};

/** Preguntas de desempate de un nivel (solo inglés por ahora). */
export function tiebreakersFor(lang: "en" | "ca", level: Level): DiagnosticQuestion[] {
  return lang === "en" ? TIEBREAKERS_EN[level] : [];
}

export const ALL_TIEBREAKERS: DiagnosticQuestion[] = Object.values(TIEBREAKERS_EN).flat();

/**
 * ¿Toca desempatar este nivel? Solo con 2 de 5 (borde), una vez por nivel, y no a quien
 * contestó "No lo sé" varias veces: eso no es mala suerte, es que el nivel aún no llegó.
 */
export function needsTiebreak(
  answers: Array<{ level: Level; correct: boolean; chosen?: number }>,
  level: Level,
  alreadyAsked: boolean
): boolean {
  if (alreadyAsked) return false;
  const bucket = answers.filter((a) => a.level === level);
  if (bucket.length !== 5 || bucket.filter((a) => a.correct).length !== 2) return false;
  return bucket.filter((a) => a.chosen === DONT_KNOW).length < 3;
}

/** Inserta cada desempate justo después de la última pregunta de su nivel. */
export function withTiebreakers(base: DiagnosticQuestion[], extra: DiagnosticQuestion[]): DiagnosticQuestion[] {
  if (extra.length === 0) return base;
  const out = [...base];
  for (const level of new Set(extra.map((e) => e.level))) {
    const last = out.map((q) => q.level).lastIndexOf(level);
    out.splice(last + 1, 0, ...extra.filter((e) => e.level === level));
  }
  return out;
}

/** Banco de preguntas según el idioma que se aprende. */
export function diagnosticFor(lang: "en" | "ca"): DiagnosticQuestion[] {
  return lang === "ca" ? DIAGNOSTIC_CA : DIAGNOSTIC;
}
