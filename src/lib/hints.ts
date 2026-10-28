import { askCoach } from "./claude";
import { spokenPart } from "./coachFormat";

type Lang = "en" | "ca";
type Kind = "conversation" | "roleplay";

/** Pista de respaldo si la IA no responde: frases útiles para arrancar. */
export function fallbackHint(lang: Lang, kind: Kind): string {
  if (lang === "ca") {
    return kind === "roleplay"
      ? 'Prova: "Podria…", "M\'agradaria…", o "En realitat…"'
      : 'Prova: "Crec que…", "En realitat…", o "Segons jo…"';
  }
  return kind === "roleplay"
    ? 'Try: "Could you…", "I\'d like to…", or "Actually…"'
    : 'Try: "I think…", "Actually…", or "In my opinion…"';
}

function hintSystem(lang: Lang, kind: Kind, level: string): string {
  if (lang === "ca") {
    return `Ets un coach de català amable${kind === "roleplay" ? " que fa un joc de rol" : ""}. L'estudiant té dificultats per respondre.
Dona UNA pista molt breu (màxim 12 paraules): un inici de frase, una paraula clau o una frase senzilla que podria fer servir.
NO donis la resposta completa. Nivell de l'estudiant: ${level}.
Respon NOMÉS amb el text de la pista, sense explicació.`;
  }
  return `You are a friendly English coach${kind === "roleplay" ? " running a role-play" : ""}. The student is struggling to respond.
Give ONE very short hint (max 12 words): a sentence starter, a key word, or a simple phrase they could use.
Do NOT give the full answer. Student level: ${level}.
Reply with only the hint text — no explanation.`;
}

/**
 * Pide una pista breve para responder al último mensaje del coach.
 * Solo usa lo que el coach DIJO (no su feedback) y nunca falla: devuelve una pista de respaldo.
 */
export async function requestHint(args: {
  lang: Lang;
  kind: Kind;
  level?: string | null;
  lastCoachMessage: string;
}): Promise<string> {
  const talk = spokenPart(args.lastCoachMessage);
  try {
    const hint = await askCoach({
      system: hintSystem(args.lang, args.kind, args.level ?? "B1"),
      messages: [{ role: "user", content: `Coach said: "${talk}"\nGive a hint to help the student respond.` }],
      maxTokens: 60,
    });
    const clean = hint.trim().replace(/^["'«]|["'»]$/g, "");
    return clean || fallbackHint(args.lang, args.kind);
  } catch {
    return fallbackHint(args.lang, args.kind);
  }
}
