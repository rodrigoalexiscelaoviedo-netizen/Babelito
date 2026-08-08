/**
 * 12 sounds catalanes — hardcoded en TS, no BD
 * Referència IPA y articulación para pronunciation exercises
 */

export interface CatalanSound {
  id: string;
  sound_ipa: string;
  name: string;
  language: "ca";
  category: "consonants" | "vowels";
  description: string;
  articulation: string;
  words: string[];
  examples: Array<{ text: string; audio_note: string }>;
}

export const catalanSounds: CatalanSound[] = [
  {
    id: "cat_sound_001",
    sound_ipa: "/ʃ/",
    name: "Xafar",
    language: "ca",
    category: "consonants",
    description:
      "El so de 'x' en catalán — entre el 'sh' anglès i la 'j' francesa",
    articulation: "Coloca la llengua darrera dels dents superiors. Deixa anar aire.",
    words: ["xafar", "xarxa", "xiquet", "xumet"],
    examples: [
      {
        text: "Els xiquets juguen a la xarxa",
        audio_note: "pronuncia 'ksiquets' i 'ksarwa'",
      },
    ],
  },
  {
    id: "cat_sound_002",
    sound_ipa: "/ʎ/",
    name: "Llum",
    language: "ca",
    category: "consonants",
    description:
      "El so de 'll' en català — com 'lli' en anglès però més palatalitzat",
    articulation: "Llengua plegada contra el paladar dur. Aire surt pels costats.",
    words: ["llum", "llibertat", "llei", "llonganissa"],
    examples: [
      {
        text: "La llum brilla en la llibertat",
        audio_note: "ambdós 'll' sonen igual",
      },
    ],
  },
  {
    id: "cat_sound_003",
    sound_ipa: "/ɲ/",
    name: "Any",
    language: "ca",
    category: "consonants",
    description:
      "El so de 'ny' en català — com 'gn' en italià (cognac) o 'ñ' en espanyol",
    articulation:
      "Llengua toca el paladar tou mentre surt aire. Semblant a 'ny' en 'canyon'",
    words: ["any", "senyora", "canya", "enganyar"],
    examples: [
      {
        text: "El senyora viu molts anys",
        audio_note: "both 'ny' sounds",
      },
    ],
  },
  {
    id: "cat_sound_004",
    sound_ipa: "/tʃ/",
    name: "Txina",
    language: "ca",
    category: "consonants",
    description: "El so de 'tx' en català — similar al 'ch' en anglès 'chip'",
    articulation:
      "Posa la punta de la llengua darrera els dents inferiors. Sofla aire amb pressió.",
    words: ["txina", "txocolata", "txec", "txano"],
    examples: [
      {
        text: "La txocolata és de Txina",
        audio_note: "pronounced 'chkolata' i 'china'",
      },
    ],
  },
  {
    id: "cat_sound_005",
    sound_ipa: "/dʒ/",
    name: "Jaqueta",
    language: "ca",
    category: "consonants",
    description: "El so de 'j' en català — com 'judge' en anglès",
    articulation:
      "Semblant a 'dj', la llengua comença darrera dels dents inferiors.",
    words: ["jaqueta", "judici", "joia", "jugar"],
    examples: [
      {
        text: "Duia una jaqueta de joia",
        audio_note: "botha 'j' sounds like 'judge'",
      },
    ],
  },
  {
    id: "cat_sound_006",
    sound_ipa: "/e/ vs /ɛ/",
    name: "Ê/è Obert",
    language: "ca",
    category: "vowels",
    description:
      "En català, 'e' té dues pronunciacions: tancada (e) i oberta (è) — semblant a anglès 'bed' (oberta)",
    articulation:
      "e tancada: davant, tancada. è oberta: davant, més oberta.",
    words: ["mestre", "dèble"],
    examples: [
      {
        text: "El mestre és dèble",
        audio_note:
          "e in 'mestre' is closed; è in 'dèble' is open",
      },
    ],
  },
  {
    id: "cat_sound_007",
    sound_ipa: "/o/ vs /ɔ/",
    name: "Ô/ò Obert",
    language: "ca",
    category: "vowels",
    description:
      "Com 'e', 'o' té dos sons: o tancada i ò oberta (més com 'or' en anglès 'short')",
    articulation:
      "o tancada: darrera, alta. ò oberta: darrera, més oberta.",
    words: ["coses", "còria"],
    examples: [
      {
        text: "Les còries són cosa antiga",
        audio_note: "o in 'cosa' is closed; ò in 'còria' is open",
      },
    ],
  },
  {
    id: "cat_sound_008",
    sound_ipa: "/r/ (flap) vs /ɾ/ (tap)",
    name: "Roda vs Rato",
    language: "ca",
    category: "consonants",
    description:
      "Dos sons de 'r': la 'r' simple és més com un tap (anglès 'tt' en 'butter'), la 'r' múltiple és un trill",
    articulation:
      "r simple: tap, punta de la llengua toca l'alvèol. r múltiple: dos o més taps.",
    words: ["roda", "rato"],
    examples: [
      {
        text: "En un rato la roda gira",
        audio_note: "first 'r' is multiple; second is tap",
      },
    ],
  },
  {
    id: "cat_sound_009",
    sound_ipa: "/ŋ/",
    name: "Banca (final)",
    language: "ca",
    category: "consonants",
    description:
      "'ng' finalment en català sona com 'ng' en anglès 'sing', no com 'nk'",
    articulation: "Nasal velar, sense tocar amb la llengua.",
    words: ["sang", "banca", "tanga", "fang"],
    examples: [
      {
        text: "La sang passa per la banca",
        audio_note: "ng sound like English 'sing'",
      },
    ],
  },
  {
    id: "cat_sound_010",
    sound_ipa: "/v/",
    name: "Vacant",
    language: "ca",
    category: "consonants",
    description:
      "'v' en català és similar a 'b' però amb els dents entre els llavis. Menys fricativa que en anglès.",
    articulation:
      "Llavi inferior toca els dents superiors. Fricativa sonora.",
    words: ["vacant", "vull", "vell", "vena"],
    examples: [
      {
        text: "La vaca vell és vacant",
        audio_note: "v sound différent from b",
      },
    ],
  },
  {
    id: "cat_sound_011",
    sound_ipa: "/w/ (u semiconsonant)",
    name: "Vuit",
    language: "ca",
    category: "consonants",
    description:
      "'u' al principi de paraula o davant vocal sona com semiconsonant: /w/ (com 'w' en anglès 'want')",
    articulation:
      "Llavis s'arrodoneixen, com per a 'u'. Aire surt ràpidament.",
    words: ["vuit", "vol", "vuita", "vuitena"],
    examples: [
      {
        text: "Vuit vuites i vuits",
        audio_note: "first 'u' is semiconsonant /w/",
      },
    ],
  },
  {
    id: "cat_sound_012",
    sound_ipa: "/ə/ (schwa)",
    name: "Schwa (síl·laba neutra)",
    language: "ca",
    category: "vowels",
    description:
      "La síl·laba neutra en català: la 'e' àtona sona com 'ə' (schwa), molt reduïda",
    articulation:
      "Boca parcialment oberta, llengua centrada. El so més còmode de la boca.",
    words: ["poma", "casa", "gata", "boca"],
    examples: [
      {
        text: "La casa té una poma",
        audio_note: "final 'a' is schwa /ə/",
      },
    ],
  },
];
