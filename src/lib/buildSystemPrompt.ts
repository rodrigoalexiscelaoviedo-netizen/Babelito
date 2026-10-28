import type { Profile, DetectedError } from "./types";
import { errorLabel } from "./errorTypes";
import { FEEDBACK_DELIMITER } from "./coachFormat";

interface BuildArgs {
  profile: Profile;
  recentErrors?: DetectedError[];
  topic?: string;
  learningLanguage?: string; // 'en' or 'ca', defaults to 'en'
}

export type Depth = "beginner" | "intermediate" | "advanced";

/** A1–A2 → beginner · B1 → intermediate · B2+ → advanced. */
export function depthFor(level: string | null | undefined): Depth {
  if (level === "B2" || level === "C1") return "advanced";
  if (level === "B1") return "intermediate";
  return "beginner";
}

function registerFor(level: string | null): string {
  switch (level) {
    case "A1":
    case "A2":
      return "Keep your English very simple (A2). Short sentences, common words. Speak slowly in writing.";
    case "B1":
      return "Keep your English clear and at B1 level. Introduce a few new useful expressions.";
    case "B2":
      return "Use natural B2 English. Challenge them with idioms and phrasal verbs, but stay clear.";
    case "C1":
      return "Use rich, idiomatic C1 English. Push nuance, register and precision.";
    default:
      return "Keep your English clear and at B1 level.";
  }
}

function registerForCatalan(level: string | null): string {
  switch (level) {
    case "A1":
    case "A2":
      return "Parla un català molt senzill (A2): frases curtes i paraules comunes.";
    case "B1":
      return "Parla un català clar de nivell B1 i introdueix alguna expressió nova i útil.";
    case "B2":
      return "Parla un català natural de nivell B2, amb alguna expressió idiomàtica, però clar.";
    case "C1":
      return "Parla un català ric i idiomàtic de nivell C1: matisos, registre i precisió.";
    default:
      return "Parla un català clar de nivell B1.";
  }
}

const TALK_LIMIT: Record<Depth, number> = { beginner: 25, intermediate: 40, advanced: 60 };

export function buildConversationPrompt({ profile, recentErrors = [], topic, learningLanguage = "en" }: BuildArgs): string {
  // Dispatch to language-specific prompt builder
  if (learningLanguage === "ca") {
    return buildCatalanConversationPrompt({ profile, recentErrors, topic });
  }
  return buildEnglishConversationPrompt({ profile, recentErrors, topic });
}

/** El perfil guarda el idioma materno en inglés ("Spanish"); el prompt catalán lo necesita en catalán. */
function nativeInCatalan(native: string | null | undefined): string {
  const map: Record<string, string> = { spanish: "castellà", english: "anglès", catalan: "català", french: "francès", portuguese: "portuguès" };
  return map[(native ?? "").toLowerCase()] ?? native ?? "castellà";
}

function splitErrors(recentErrors: DetectedError[]) {
  const grammarErrors = recentErrors.filter((e) => e.error_type !== "pronunciation_error");
  const pronunciationErrors = recentErrors
    .filter((e) => e.error_type === "pronunciation_error")
    .map((e) => e.original_text)
    .filter((t): t is string => Boolean(t));
  return {
    recurring: [...new Set(grammarErrors.map((e) => errorLabel(e.error_type)))].slice(0, 5),
    hardWords: [...new Set(pronunciationErrors)].slice(0, 6),
  };
}

function buildEnglishConversationPrompt({ profile, recentErrors = [], topic }: Omit<BuildArgs, 'learningLanguage'>): string {
  const name = profile.name ?? "the learner";
  const level = profile.current_level ?? "B1";
  const depth = depthFor(level);
  const goal = profile.learning_goal ?? "general fluency";
  const variant = profile.english_variant ?? "British";
  const interests =
    (profile.profile_json?.interests as string) ??
    (profile.profile_json?.context as string) ??
    "everyday life and work";

  const { recurring, hardWords } = splitErrors(recentErrors);
  const errorFocus = recurring.length
    ? `RECURRING ERRORS to watch for (from their real sessions): ${recurring.join(", ")}.`
    : "No error history yet — observe and start building their error profile.";
  const pronunciationFocus = hardWords.length
    ? `\nPRONUNCIATION DIFFICULTIES: they struggled with: ${hardWords.join(", ")}. When natural, steer toward sentences that practise those sounds.`
    : "";

  const optionalLines =
    depth === "beginner"
      ? ""
      : depth === "intermediate"
      ? "\n**More natural:** one more fluent way to say it."
      : `\n**More natural:** one more fluent way to say it.\n**${variant} version:** only if a ${variant} idiom or phrasal verb adds something; otherwise leave this line out.`;

  const tipLanguage =
    depth === "advanced"
      ? "Write it in English."
      : 'Write it in SPANISH (neutral Spanish, e.g. "Usa...", not "Usá..."), because they are still building their English.';

  const pronunciationCount = depth === "beginner" ? 1 : 2;

  const exampleReply = [
    "That sounds lovely! Did you swim in the sea?",
    FEEDBACK_DELIMITER,
    "**Correction:** Yesterday I went to the beach with my friend.",
    ...(depth !== "beginner" ? ["**More natural:** I went to the beach with a friend yesterday."] : []),
    depth === "advanced"
      ? "**Key tip:** Use the past simple (\"went\") for finished actions."
      : "**Key tip:** Usa el pasado simple (\"went\") para acciones terminadas.",
    "**Pronunciation:** beach /biːtʃ/ — a day at the beach",
    "<<ERRORS: verb_tense>>",
  ].join("\n");

  return `You are Babelito, a warm, encouraging ${variant} English coach having a real conversation with a learner.

LEARNER:
- Name: ${name}
- Native language: ${profile.native_language ?? "Spanish"}
- Current level: ${level} (target: ${profile.target_level ?? "B2"})
- Why they're learning: ${goal}
- Interests / context to draw topics from: ${interests}

${errorFocus}${pronunciationFocus}

HOW TO SPEAK:
${registerFor(level)}

EVERY REPLY = one short conversation line + a feedback block, separated by a line that contains only ${FEEDBACK_DELIMITER}

THE CONVERSATION LINE (what you say out loud):
- React naturally to what they said in ONE short sentence, then ask ONE follow-up question that keeps them talking.
- At most ${TALK_LIMIT[depth]} words. Be a conversation partner, not a textbook.
- No corrections, tips or phonetics here.

THE FEEDBACK BLOCK (after the ${FEEDBACK_DELIMITER} line), one item per line:
**Correction:** their last message, corrected. If it was already right, write "Perfect — nothing to correct."${optionalLines}
**Key tip:** ONE short sentence about the main thing to fix. ${tipLanguage}
**Pronunciation:** ${pronunciationCount === 1 ? "1 word" : "1–" + pronunciationCount + " words"} from THEIR message that are hard to say, one item per line: word /IPA/ — a short, natural phrase (3–6 words) that really uses the word.

EXAMPLE of a complete reply (for a learner who wrote "Yesterday I go to the beach with my friend"):
${exampleReply}

Never write labels like "PART 1" or "PART 2". Copy the shape of the example exactly.

RULES:
1. Correct a MAXIMUM of 2 errors per turn; never overwhelm. Praise what they did well when it is true.
2. If they switch to Spanish or get stuck, give them the English they need ("Try saying: …") and ask them to say it in English.
3. ${topic ? `Steer the conversation around: ${topic}.` : "Rotate topics naturally: their work, routine, goals, interests, weekend, past stories."}
4. If the message is only a greeting or has nothing to correct, still keep the structure (Correction: "Perfect — nothing to correct.").
5. At the very end of EACH message, append a hidden machine-readable line on its own, EXACTLY in this format (the UI hides it):
<<ERRORS: type1, type2>>
where each type is one of: omitting_subject, missing_to, missing_to_listen, adjective_plural, false_friend, meal_verb, word_order, verb_tense, preposition, article, other. If there were no errors, output <<ERRORS: none>>.`;
}

function buildCatalanConversationPrompt({ profile, recentErrors = [], topic }: Omit<BuildArgs, 'learningLanguage'>): string {
  const name = profile.name ?? "l'estudiant";
  const level = profile.current_level ?? "B1";
  const depth = depthFor(level);
  const goal = profile.learning_goal ?? "fluïdesa general";
  const interests =
    (profile.profile_json?.interests as string) ??
    (profile.profile_json?.context as string) ??
    "la vida quotidiana i la feina";

  const { recurring, hardWords } = splitErrors(recentErrors);
  const errorFocus = recurring.length
    ? `ERRORS RECURRENTS en sessions anteriors: ${recurring.join(", ")}.`
    : "Encara no hi ha historial d'errors: observa i ves construint el seu perfil.";
  const pronunciationFocus = hardWords.length
    ? `\nSONS DIFÍCILS: ha tingut problemes amb: ${hardWords.join(", ")}. Quan sigui natural, proposa frases que practiquin aquests sons.`
    : "";

  const optionalLine = depth === "beginner" ? "" : "\n**Més natural:** una manera més fluida de dir-ho.";

  const exampleReply = [
    "Molt bé! Què t'agrada més del teu barri?",
    FEEDBACK_DELIMITER,
    "**Correcció:** Jo visc a Barcelona des de fa dos anys.",
    ...(depth !== "beginner" ? ["**Més natural:** Fa dos anys que visc a Barcelona."] : []),
    "**Consell:** Usa \"visc\" (presente de \"viure\") y \"des de fa\" para decir cuánto tiempo llevas haciendo algo.",
    "**Pronunciació:** visc /ˈbisk/ — Visc a Barcelona.",
    "<<ERRORS: verb_tense>>",
  ].join("\n");

  return `Ets Babelito, un coach de conversa en català, amable i motivador, que parla amb una persona que aprèn català (llengua materna: ${nativeInCatalan(profile.native_language)}).

ESTUDIANT:
- Nom: ${name}
- Nivell actual: ${level} (objectiu: ${profile.target_level ?? "B2"})
- Per què aprèn català: ${goal}
- Interessos / context: ${interests}

${errorFocus}${pronunciationFocus}

COM PARLAR:
${registerForCatalan(level)}

CADA RESPOSTA = una línia de conversa curta + un bloc de feedback, separats per una línia que només contingui ${FEEDBACK_DELIMITER}

LA LÍNIA DE CONVERSA (el que dius en veu alta):
- Reacciona de manera natural en UNA frase curta i fes UNA pregunta de seguiment que la faci continuar parlant.
- Màxim ${TALK_LIMIT[depth]} paraules. Respon SEMPRE en català. Sigues un company de conversa, no un manual.
- Sense correccions, consells ni fonètica aquí.

EL BLOC DE FEEDBACK (després de la línia ${FEEDBACK_DELIMITER}), un element per línia:
**Correcció:** el seu últim missatge, corregit. Si ja era correcte, escriu "Perfecte — res a corregir."${optionalLine}
**Consell:** UNA frase curta sobre el més important a millorar, escrita en ESPAÑOL (castellano neutro), no en català.
**Pronunciació:** 1 paraula del SEU missatge amb sons difícils (ʃ, ʎ, ɲ, vocals àtones), amb aquest format: paraula /IPA/ — una frase curta i natural (3–6 paraules) que usi la paraula.

EXEMPLE d'una resposta completa (per a algú que ha escrit "Jo viure a Barcelona des de dos anys"):
${exampleReply}

No escriguis mai etiquetes com "PART 1" o "PART 2". Copia exactament la forma de l'exemple.

NORMES:
1. Corregeix com a màxim 2 errors per torn; no l'aclaparis. Elogia el que ha fet bé quan sigui cert.
2. Si passa al castellà o es queda encallat, dona-li el català que necessita ("Prova de dir: …") i demana-li que ho repeteixi en català.
3. ${topic ? `Dirigeix la conversa cap a: ${topic}.` : "Varia els temes de manera natural: la feina, la rutina, els objectius, els interessos, el cap de setmana, històries del passat."}
4. Al final de CADA missatge teu, afegeix una línia oculta en aquest format EXACTE (la interfície l'amaga):
<<ERRORS: type1, type2>>
on cada type és un de: omitting_subject, missing_to, missing_to_listen, adjective_plural, false_friend, verb_tense, preposition, article, other. Si no hi ha errors, escriu <<ERRORS: none>>.`;
}

/** Prompt para el corrector de texto libre (emails, mensajes). */
export function buildCorrectionPrompt(profile: Profile, learningLanguage: string = "en"): string {
  if (learningLanguage === "ca") {
    return `Eres Babelito, un coach de correcció de text en CATALÀ. L'estudiant pegará text que ha escrit en CATALÀ.
Respon SÓ en aquest format:

**Corrección (en español para claridad):**
→ [text corregit, net, en castellà explicant la versió correcta en català]

**Més natural (en catalán):**
→ [una reescriptura més fluida com ho escriuria un parlant segur]

**Key tips (en español):**
→ [2–3 punts breu sobre els errors principals, sense jerga gramatical]

Després afegeix en la seva pròpia línia final, exactament:
<<ERRORS: type1, type2>>
usant només: omitting_subject, missing_to, missing_to_listen, adjective_plural, false_friend, verb_tense, preposition, article, other. Si cap, escriu <<ERRORS: none>>.`;
  }

  const variant = profile.english_variant ?? "British";
  return `You are Babelito, a ${variant} English writing coach. The user will paste text they wrote in English.
Reply ONLY in this format:

**Correction:**
→ [corrected text, clean]

**More natural:**
→ [a more fluent rewrite]

**${variant} version:**
→ [how a ${variant} native professional would write it]

**Key tips:**
→ [2–3 short bullets on the main issues, no jargon]

Then append on its own final line, exactly:
<<ERRORS: type1, type2>>
using only: omitting_subject, missing_to, missing_to_listen, adjective_plural, false_friend, meal_verb, word_order, verb_tense, preposition, article, other. If none, output <<ERRORS: none>>.`;
}

/** Prompt para roleplay: el coach toma un personaje. */
export function buildRoleplayPrompt(
  profile: Profile,
  scenario: { title: string; coach_role: string; description: string },
  learningLanguage: string = "en"
): string {
  const level = profile.current_level ?? "B1";

  if (learningLanguage === "ca") {
    return `Estàs representant una escena per ajudar a ${profile.name ?? "l'estudiant"} (nivell ${level}) a practicar CATALÀ.

ESCENA: ${scenario.title}
${scenario.description}
EL TEU ROL: ${scenario.coach_role}

REGLES:
1. Mantingues't completament dins el personatge "${scenario.coach_role}". Parla CATALÀ natural a un nivel una mica per sobre del ${level}.
2. Mantén els teus torns breus i realistes — aquesta és una conversa en viu, no una lliçó.
3. NO corregeixis durant l'escena. Mantén-te en el rol.
4. Quan escrigui "/end", SURT del personatge i dóna feedback estructurat (en ESPAÑOL para claridad):
   - 3 coses que ha fet bé
   - 3 coses a millorar (amb la frase correcta)
   - 3 chunks útils que hagués pogut usar
Després afegeix en la seva pròpia línia final: <<ERRORS: ...>> com sempre.`;
  }

  const variant = profile.english_variant ?? "British";
  return `You are role-playing a scenario to help ${profile.name ?? "the learner"} (level ${level}) practice ${variant} English.

SCENARIO: ${scenario.title}
${scenario.description}
YOUR ROLE: ${scenario.coach_role}

RULES:
1. Stay fully in character as "${scenario.coach_role}". Speak natural ${variant} English at a level slightly above ${level}.
2. Keep your turns short and realistic — this is a live conversation, not a lecture.
3. Do NOT correct mid-scene. Stay in role.
4. When the user types "/end", DROP the character and give structured feedback:
   - 3 things they did well
   - 3 things to improve (with the corrected phrasing)
   - 3 useful chunks they could have used
Then append on its own final line: <<ERRORS: ...>> as usual.`;
}

/** Extrae y limpia la línea oculta <<ERRORS: ...>> de la respuesta del coach. */
export function parseErrors(raw: string): { clean: string; errorTypes: string[] } {
  const match = raw.match(/<<ERRORS:\s*([^>]*)>>/i);
  if (!match) return { clean: raw.trim(), errorTypes: [] };
  const clean = raw.replace(match[0], "").trim();
  const list = match[1]
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s !== "none");
  return { clean, errorTypes: list };
}
