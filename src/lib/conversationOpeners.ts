/**
 * Primera frase del coach al abrir una conversación.
 *
 * Antes la app mandaba un mensaje FALSO como si lo hubieras escrito vos
 * ("Hi! I'd like to talk about…") y encima contaba como uno de los 3 turnos
 * mínimos. Ahora abre el coach con una pregunta concreta sobre el tema, sin
 * llamar a la IA (instantáneo y sin gastar cuota), y todos los turnos del
 * usuario son reales.
 */

type Lang = "en" | "ca";

interface Opener {
  /** Para A1–A2: pregunta corta y simple. */
  simple: string;
  /** Para B1+: pregunta más abierta. */
  rich: string;
}

const EN: Record<string, Opener> = {
  "your work": {
    simple: "What is your job?",
    rich: "What do you do for work, and what do you enjoy most about it?",
  },
  "your weekend": {
    simple: "What did you do last weekend?",
    rich: "How was your weekend? Tell me the best thing you did.",
  },
  "a goal you have": {
    simple: "What is one goal you have this year?",
    rich: "What's a goal you're working towards right now, and why does it matter to you?",
  },
  "something you enjoy": {
    simple: "What do you like to do for fun?",
    rich: "What's something you really enjoy doing, and how did you get into it?",
  },
  "free chat": {
    simple: "How are you today?",
    rich: "How's your day going? Anything interesting happen?",
  },
  "your morning routine": {
    simple: "What do you do in the morning?",
    rich: "Walk me through your morning. What's the first thing you do after waking up?",
  },
  "a hobby you enjoy": {
    simple: "What is your hobby?",
    rich: "Tell me about a hobby you enjoy. What do you love about it?",
  },
  "your favourite place to visit": {
    simple: "What is your favourite place?",
    rich: "What's your favourite place to visit, and what makes it special?",
  },
  "how technology affects your life": {
    simple: "Do you use your phone a lot?",
    rich: "How does technology change your daily life, for better or worse?",
  },
  "a book or film you liked recently": {
    simple: "What film do you like?",
    rich: "Have you read a book or watched a film you liked recently? What was it about?",
  },
  "your goals for this month": {
    simple: "What do you want to do this month?",
    rich: "What do you want to achieve this month?",
  },
  "a challenge you overcame": {
    simple: "Was something difficult for you? What was it?",
    rich: "Tell me about a challenge you overcame. How did you do it?",
  },
  "what you find most interesting about your job": {
    simple: "What do you like about your job?",
    rich: "What do you find most interesting about your job?",
  },
};

const CA: Record<string, Opener> = {
  "el teu treball": {
    simple: "Quina feina fas?",
    rich: "Quina feina fas i què és el que més t'agrada d'ella?",
  },
  "el teu cap de setmana": {
    simple: "Què vas fer el cap de setmana?",
    rich: "Com ha anat el cap de setmana? Explica'm el millor que has fet.",
  },
  "un objectiu que tens": {
    simple: "Quin objectiu tens aquest any?",
    rich: "Quin objectiu estàs perseguint ara mateix i per què és important per a tu?",
  },
  "quelcom que gaudixis": {
    simple: "Què t'agrada fer per divertir-te?",
    rich: "Què és el que més gaudeixes fent i com vas començar?",
  },
  "xat lliure": {
    simple: "Com estàs avui?",
    rich: "Com va el dia? Ha passat res d'interessant?",
  },
  "la teva rutina del matí": {
    simple: "Què fas al matí?",
    rich: "Explica'm el teu matí. Què és el primer que fas quan et lleves?",
  },
  "un lloc que t'agrada de barcelona": {
    simple: "Quin lloc de Barcelona t'agrada?",
    rich: "Quin lloc de Barcelona t'agrada més i què el fa especial?",
  },
  "el que has fet aquest cap de setmana": {
    simple: "Què has fet aquest cap de setmana?",
    rich: "Què has fet aquest cap de setmana? Explica'm el més divertit.",
  },
  "una afició teva": {
    simple: "Quina és la teva afició?",
    rich: "Parla'm d'una afició teva. Què t'agrada d'ella?",
  },
  "el teu barri": {
    simple: "Com és el teu barri?",
    rich: "Com és el teu barri i què és el que més t'agrada?",
  },
  "menjar que t'agrada cuinar": {
    simple: "Què t'agrada cuinar?",
    rich: "Quin plat t'agrada cuinar més? Com el prepares?",
  },
  "un repte que has superat": {
    simple: "Què ha estat difícil per a tu?",
    rich: "Explica'm un repte que has superat. Com ho vas fer?",
  },
  "la teva família i els teus amics": {
    simple: "Parla'm de la teva família.",
    rich: "Parla'm de la teva família i dels teus amics. Què feu junts?",
  },
};

export function isBeginner(level: string | null | undefined): boolean {
  return level === "A1" || level === "A2" || !level;
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Texto con el que abre el coach. */
export function openingLine(args: {
  lang: Lang;
  name?: string | null;
  topic?: string | null;
  level?: string | null;
}): string {
  const { lang } = args;
  const name = firstName(args.name);
  const beginner = isBeginner(args.level);
  const table = lang === "ca" ? CA : EN;
  const key = (args.topic ?? "").trim().toLowerCase();
  const entry = table[key];

  const hello =
    lang === "ca" ? (name ? `Hola, ${name}!` : "Hola!") : name ? `Hi ${name}!` : "Hi!";

  if (!args.topic || !entry) {
    // Tema libre o desconocido (p. ej. uno escrito a mano): pregunta genérica y honesta.
    if (args.topic && key !== "free chat" && key !== "xat lliure") {
      const t = args.topic.trim();
      return lang === "ca"
        ? `${hello} Parlem de: ${t}. ${beginner ? "Què en penses?" : "Què és el primer que et ve al cap?"}`
        : `${hello} Let's talk about: ${t}. ${beginner ? "What do you think about it?" : "What comes to mind first?"}`;
    }
    const free = table[lang === "ca" ? "xat lliure" : "free chat"];
    return `${hello} ${beginner ? free.simple : free.rich}`;
  }

  const lead =
    lang === "ca"
      ? `Parlem d'això: ${args.topic.trim().toLowerCase()}.`
      : `Let's talk about ${args.topic.trim().toLowerCase()}.`;
  return `${hello} ${lead} ${beginner ? entry.simple : entry.rich}`;
}
