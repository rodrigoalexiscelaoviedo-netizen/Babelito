export interface MinimalPair {
  a: string;
  b: string;
  soundA: string;
  soundB: string;
}

export interface SoundEntry {
  id: string;
  ipa: string;
  name: string;
  nameEs: string;
  articulation: string;
  examples: string[];
  minimalPairs: MinimalPair[];
  shadowingPhrase: string;
}

export const SOUNDS: SoundEntry[] = [
  {
    id: "th-voiceless",
    ipa: "/θ/",
    name: "th suave (think)",
    nameEs: "Como en 'think', 'three', 'bath'",
    articulation:
      "Sacá la punta de la lengua entre los dientes superiores e inferiores y soplá suave, sin activar la voz.",
    examples: ["think", "three", "bath"],
    minimalPairs: [
      { a: "think", b: "sink", soundA: "/θ/", soundB: "/s/" },
      { a: "three", b: "free", soundA: "/θ/", soundB: "/f/" },
      { a: "bath", b: "bass", soundA: "/θ/", soundB: "/s/" },
    ],
    shadowingPhrase: "I think three is the right number.",
  },
  {
    id: "th-voiced",
    ipa: "/ð/",
    name: "th sonoro (this)",
    nameEs: "Como en 'this', 'that', 'the'",
    articulation:
      "Igual que /θ/ pero con voz: lengua entre los dientes y hacés vibrar las cuerdas vocales.",
    examples: ["this", "that", "breathe"],
    minimalPairs: [
      { a: "this", b: "dis", soundA: "/ð/", soundB: "/d/" },
      { a: "breathe", b: "breed", soundA: "/ð/", soundB: "/d/" },
      { a: "that", b: "dat", soundA: "/ð/", soundB: "/d/" },
    ],
    shadowingPhrase: "This is the other side.",
  },
  {
    id: "short-i",
    ipa: "/ɪ/",
    name: "i corta (ship)",
    nameEs: "Como en 'ship', 'sit', 'bit' — más corta y relajada que nuestra 'i'",
    articulation:
      "Boca casi cerrada, labios relajados (no estirados). La lengua toca ligeramente el paladar. Sonido breve.",
    examples: ["ship", "sit", "bit"],
    minimalPairs: [
      { a: "ship", b: "sheep", soundA: "/ɪ/", soundB: "/iː/" },
      { a: "sit", b: "seat", soundA: "/ɪ/", soundB: "/iː/" },
      { a: "bit", b: "beat", soundA: "/ɪ/", soundB: "/iː/" },
    ],
    shadowingPhrase: "Did the ship hit the bridge?",
  },
  {
    id: "long-ee",
    ipa: "/iː/",
    name: "i larga (sheep)",
    nameEs: "Como en 'sheep', 'seat', 'beat' — más larga y tensa que /ɪ/",
    articulation:
      "Labios estirados hacia los costados (sonrisa), lengua alta y adelantada. Mantené el sonido más tiempo.",
    examples: ["sheep", "seat", "beat"],
    minimalPairs: [
      { a: "sheep", b: "ship", soundA: "/iː/", soundB: "/ɪ/" },
      { a: "seat", b: "sit", soundA: "/iː/", soundB: "/ɪ/" },
      { a: "beat", b: "bit", soundA: "/iː/", soundB: "/ɪ/" },
    ],
    shadowingPhrase: "Please meet me by the green tree.",
  },
  {
    id: "ae",
    ipa: "/æ/",
    name: "a abierta (cat)",
    nameEs: "Como en 'cat', 'bad', 'man' — más abierta y frontal que nuestra 'a'",
    articulation:
      "Abrí la boca más de lo normal, mandíbula baja. La lengua queda plana y baja. Estirá ligeramente los labios.",
    examples: ["cat", "bad", "man"],
    minimalPairs: [
      { a: "cat", b: "cut", soundA: "/æ/", soundB: "/ʌ/" },
      { a: "bad", b: "bud", soundA: "/æ/", soundB: "/ʌ/" },
      { a: "man", b: "men", soundA: "/æ/", soundB: "/e/" },
    ],
    shadowingPhrase: "The black cat sat on the mat.",
  },
  {
    id: "schwa-cup",
    ipa: "/ʌ/",
    name: "a central (cup)",
    nameEs: "Como en 'cup', 'but', 'love' — sonido neutral en el centro de la boca",
    articulation:
      "Boca ligeramente abierta, labios relajados sin mover. La lengua en posición neutral, sin tensión.",
    examples: ["cup", "but", "love"],
    minimalPairs: [
      { a: "cup", b: "cap", soundA: "/ʌ/", soundB: "/æ/" },
      { a: "but", b: "bat", soundA: "/ʌ/", soundB: "/æ/" },
      { a: "love", b: "live", soundA: "/ʌ/", soundB: "/ɪ/" },
    ],
    shadowingPhrase: "Come on, run and have some fun.",
  },
  {
    id: "schwa",
    ipa: "/ə/",
    name: "schwa (about)",
    nameEs: "La vocal más común del inglés — en sílabas átonas como 'a-bout', 'to-day'",
    articulation:
      "Boca entreabierta, mandíbula caída, lengua y labios completamente relajados. No hagas ningún esfuerzo — el sonido sale solo.",
    examples: ["about", "today", "camera"],
    minimalPairs: [
      { a: "about", b: "a bout", soundA: "/ə/", soundB: "/æ/" },
      { a: "today", b: "two day", soundA: "/ə/", soundB: "/uː/" },
      { a: "camera", b: "comma", soundA: "/ə/", soundB: "/ɒ/" },
    ],
    shadowingPhrase: "A camera was left about a sofa.",
  },
  {
    id: "v-vs-b",
    ipa: "/v/",
    name: "v labio-dental (very)",
    nameEs: "Como en 'very', 'vote', 'love' — el labio inferior toca los dientes",
    articulation:
      "Mordé suavemente el labio inferior con los dientes superiores y hacé vibrar la voz. No es /b/ — el aire sale entre los dientes y el labio.",
    examples: ["very", "vote", "love"],
    minimalPairs: [
      { a: "very", b: "berry", soundA: "/v/", soundB: "/b/" },
      { a: "vine", b: "bine", soundA: "/v/", soundB: "/b/" },
      { a: "vest", b: "best", soundA: "/v/", soundB: "/b/" },
    ],
    shadowingPhrase: "I love the view from every village.",
  },
  {
    id: "h",
    ipa: "/h/",
    name: "h aspirada (hello)",
    nameEs: "Como en 'hello', 'hot', 'have' — aire soplado sin voz, nunca muda",
    articulation:
      "Simplemente soplá aire por la boca con la garganta abierta, como si empañaras un vidrio. Ningún contacto de lengua ni labios.",
    examples: ["hello", "hot", "have"],
    minimalPairs: [
      { a: "hair", b: "air", soundA: "/h/", soundB: "∅" },
      { a: "hill", b: "ill", soundA: "/h/", soundB: "∅" },
      { a: "heart", b: "art", soundA: "/h/", soundB: "∅" },
    ],
    shadowingPhrase: "He had a huge house on the hill.",
  },
  {
    id: "ng",
    ipa: "/ŋ/",
    name: "ng nasal (sing)",
    nameEs: "Como en 'sing', 'ring', 'going' — nasal velar, sin la 'g' final",
    articulation:
      "La parte trasera de la lengua sube y toca el velo del paladar (fondo de la boca). El aire sale por la nariz. No pronuncies la 'g'.",
    examples: ["sing", "ring", "going"],
    minimalPairs: [
      { a: "sing", b: "sin", soundA: "/ŋ/", soundB: "/n/" },
      { a: "ring", b: "rin", soundA: "/ŋ/", soundB: "/n/" },
      { a: "king", b: "kin", soundA: "/ŋ/", soundB: "/n/" },
    ],
    shadowingPhrase: "Singing and dancing bring me joy.",
  },
  {
    id: "r",
    ipa: "/r/",
    name: "r inglesa (red)",
    nameEs: "Como en 'red', 'right', 'around' — sin vibrar, lengua curvada",
    articulation:
      "Curvá la punta de la lengua hacia atrás sin tocar nada. Los labios se redondean ligeramente. Nunca vibrés la lengua como en español.",
    examples: ["red", "right", "around"],
    minimalPairs: [
      { a: "red", b: "led", soundA: "/r/", soundB: "/l/" },
      { a: "right", b: "light", soundA: "/r/", soundB: "/l/" },
      { a: "rain", b: "lane", soundA: "/r/", soundB: "/l/" },
    ],
    shadowingPhrase: "The red car turned right at the corner.",
  },
  {
    id: "ed-endings",
    ipa: "-ed",
    name: "terminaciones -ed",
    nameEs: "Verbos en pasado: -ed suena /t/, /d/ o /ɪd/ según el verbo",
    articulation:
      "Regla: si el verbo termina en /t/ o /d/, decís /ɪd/ (wanted, needed). Si termina en consonante sorda, decís /t/ (worked, laughed). En el resto, /d/ (played, loved).",
    examples: ["worked", "wanted", "played"],
    minimalPairs: [
      { a: "worked", b: "walked", soundA: "/t/", soundB: "/t/" },
      { a: "wanted", b: "wand", soundA: "/ɪd/", soundB: "∅" },
      { a: "played", b: "plate", soundA: "/d/", soundB: "/t/" },
    ],
    shadowingPhrase: "She worked hard, wanted more, and played fair.",
  },
];
