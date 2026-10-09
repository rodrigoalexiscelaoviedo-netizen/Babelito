import type { en } from "./en";

// Forma de los mensajes (mismas claves, valores string), sin atar los valores a inglés.
type Shape<T> = { [K in keyof T]: T[K] extends object ? Shape<T[K]> : string };

// Textos de interfaz en català. Mismas claves que en.ts (`satisfies` obliga a
// que falte o sobre alguna clave y TypeScript lo marca en el build).
export const ca: Shape<typeof en> = {
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
    groupPractice: "Pràctica",
    groupContent: "Contingut",
    groupAccount: "Compte",
    more: "Més",
    moreModules: "Més mòduls",
    close: "Tanca",
    brand: "Babelito",
  },
};
