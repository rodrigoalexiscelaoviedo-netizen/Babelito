import type { en } from "./en";

// Forma de los mensajes (mismas claves, valores string), sin atar los valores a inglés.
type Shape<T> = { [K in keyof T]: T[K] extends object ? Shape<T[K]> : string };

// Textos de interfaz en català. Mismas claves que en.ts (`satisfies` obliga a
// que falte o sobre alguna clave y TypeScript lo marca en el build).
export const ca: Shape<typeof en> = {
  common: {
    close: "Tanca",
    back: "Enrere",
    signingOut: "Tancant sessió…",
  },
  nav: {
    home: "Inici",
    talk: "Parla",
    chunks: "Expressions",
    correct: "Corregeix",
    roleplay: "Rol",
    reading: "Lectura",
    stories: "Històries",
    sounds: "Sons",
    review: "Repàs",
    listening: "Escolta",
    progress: "Progrés",
    profile: "Perfil",
    situations: "Situacions",
    words: "Les meves paraules",
    groupSpeak: "Parla i escriu",
    groupSounds: "Sons i escolta",
    groupRead: "Llegeix",
    groupRemember: "Recorda",
    groupYou: "Tu",
    more: "Més",
    moreModules: "Més mòduls",
    close: "Tanca",
    brand: "Babelito",
  },
};
