/**
 * Las 5 puertas de la app. Cada puerta agrupa herramientas por lo que la persona
 * quiere HACER (hablar, escuchar y leer, recordar, ver su avance), no por cómo
 * están construidas. Las rutas existentes no cambian.
 */

export type HubId = "speak" | "learn" | "remember" | "me";

export interface HubText {
  title: string;
  desc: string;
}

export interface HubItem {
  to: string;
  icon: string;
  en: HubText;
  /** Sin versión catalana todavía: la herramienta se oculta en catalán. */
  ca?: HubText;
  /** Marca el ítem principal ("empezá por acá") de la puerta. */
  featured?: boolean;
  /** Muestra la cantidad de repasos pendientes. */
  dueBadge?: boolean;
}

export interface HubDef {
  id: HubId;
  path: string;
  icon: string;
  en: { nav: string; title: string; subtitle: string };
  ca: { nav: string; title: string; subtitle: string };
  items: HubItem[];
}

export const HUBS: HubDef[] = [
  {
    id: "speak",
    path: "/speak",
    icon: "MessageCircle",
    en: { nav: "Speak", title: "Speak", subtitle: "Practise talking: the fastest way to get fluent." },
    ca: { nav: "Parlar", title: "Parlar", subtitle: "Practica parlant: la manera més ràpida d'aprendre." },
    items: [
      {
        to: "/conversation",
        icon: "MessageCircle",
        featured: true,
        en: { title: "Talk to your coach", desc: "A live conversation with corrections. Use Call or Live for a voice chat." },
        ca: { title: "Parla amb el coach", desc: "Conversa en directe amb correccions." },
      },
      {
        to: "/situations",
        icon: "Target",
        en: { title: "Situations", desc: "Airport, restaurant, interview… train one real-life situation from every angle." },
      },
      {
        to: "/roleplay",
        icon: "Drama",
        en: { title: "Roleplay", desc: "Act out a scene: interviews, calls, meetings." },
        ca: { title: "Representa una escena", desc: "Entrevistes, crides, reunions." },
      },
      {
        to: "/sounds",
        icon: "Mic",
        en: { title: "Pronunciation", desc: "Train the sounds that are hard for Spanish speakers." },
        ca: { title: "Pronunciació", desc: "Entrena els sons difícils." },
      },
      {
        to: "/correct",
        icon: "PencilLine",
        en: { title: "Fix my writing", desc: "Paste an email or message and get it corrected." },
        ca: { title: "Corregeix la meva escriptura", desc: "Enganxa un correu o missatge." },
      },
    ],
  },
  {
    id: "learn",
    path: "/learn",
    icon: "Headphones",
    en: { nav: "Learn", title: "Listen & read", subtitle: "Absorb English with content you actually enjoy." },
    ca: { nav: "Aprendre", title: "Escoltar i llegir", subtitle: "Aprèn amb contingut que t'agrada." },
    items: [
      {
        to: "/stories",
        icon: "BookText",
        featured: true,
        en: { title: "Stories", desc: "Short stories at your level. Tap any word to understand it." },
        ca: { title: "Històries", desc: "Històries curtes al teu nivell." },
      },
      {
        to: "/reading",
        icon: "BookOpen",
        en: { title: "Reading", desc: "Texts for everyday life, with word help." },
        ca: { title: "Lectura", desc: "Textos per a la vida quotidiana." },
      },
      {
        to: "/listening",
        icon: "Headphones",
        en: { title: "Listening", desc: "Understand fast, natural speech." },
        ca: { title: "Escolta", desc: "Entén la parla ràpida i natural." },
      },
      {
        to: "/dictation",
        icon: "Keyboard",
        en: { title: "Dictation", desc: "Listen and write what you hear." },
      },
      {
        to: "/lens",
        icon: "Camera",
        en: { title: "Photo helper", desc: "Take a photo of a menu or sign and understand it." },
      },
    ],
  },
  {
    id: "remember",
    path: "/remember",
    icon: "Layers",
    en: { nav: "Remember", title: "Remember", subtitle: "Make what you learn stay in your head." },
    ca: { nav: "Recordar", title: "Recordar", subtitle: "Fes que el que aprens es quedi." },
    items: [
      {
        to: "/review",
        icon: "Layers",
        featured: true,
        dueBadge: true,
        en: { title: "Daily review", desc: "A few minutes a day with listening, gaps and speaking exercises." },
        ca: { title: "Repàs diari", desc: "Uns minuts al dia." },
      },
      {
        to: "/words",
        icon: "BookMarked",
        en: { title: "My words", desc: "Everything you saved, with status and audio." },
        ca: { title: "Les meves paraules", desc: "Tot el que has desat." },
      },
      {
        to: "/chunks",
        icon: "Library",
        en: { title: "Phrase library", desc: "Ready-made expressions for work and daily life." },
        ca: { title: "Biblioteca d'expressions", desc: "Expressions ja fetes." },
      },
      {
        to: "/grammar",
        icon: "GraduationCap",
        en: { title: "Grammar", desc: "Short lessons on the mistakes you actually make." },
      },
      {
        to: "/mistakes",
        icon: "TrendingDown",
        en: { title: "My mistakes", desc: "See your recurring errors and fix them with exercises." },
      },
    ],
  },
  {
    id: "me",
    path: "/me",
    icon: "User",
    en: { nav: "Me", title: "My progress", subtitle: "See how far you've come and what's next." },
    ca: { nav: "Jo", title: "El meu progrés", subtitle: "Mira fins on has arribat." },
    items: [
      {
        to: "/progress",
        icon: "BarChart3",
        featured: true,
        en: { title: "Progress & level", desc: "Your level ladder, streak, stats and reports." },
        ca: { title: "Progrés", desc: "El teu nivell, ratxa i estadístiques." },
      },
      {
        to: "/plan",
        icon: "CalendarCheck",
        en: { title: "My plan", desc: "What to do today and this week." },
      },
      {
        to: "/profile",
        icon: "User",
        en: { title: "Profile & settings", desc: "Level, voice, reminders and goals." },
        ca: { title: "Perfil i ajustos", desc: "Nivell, veu i recordatoris." },
      },
    ],
  },
];

export const hubById = (id: HubId): HubDef => HUBS.find((h) => h.id === id) as HubDef;

/** Herramientas visibles según el idioma que se aprende (el catalán aún no tiene todo). */
export function visibleItems(hub: HubDef, language: string | null | undefined): Array<HubItem & { text: HubText }> {
  const ca = language === "ca";
  return hub.items.filter((i) => !ca || i.ca).map((i) => ({ ...i, text: ca ? (i.ca as HubText) : i.en }));
}

/** ¿Qué puerta contiene esta ruta? (para marcarla activa en el menú). */
export function hubForPath(pathname: string): HubDef | null {
  return (
    HUBS.find((h) => pathname === h.path || h.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))) ?? null
  );
}
