import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";
import type { ChatTurn } from "./types";
import { scopeByLanguage } from "./language";
import { parseAiJson } from "./json";
import { splitCoachReply } from "./coachFormat";

export interface KeyError {
  error: string;
  correction: string;
}

export interface SessionReport {
  id: string;
  user_id: string;
  session_id: string | null;
  kind: "conversation" | "roleplay";
  summary: string;
  did_well: string[];
  key_errors: KeyError[];
  suggested_chunks: string[];
  created_at: string;
}

type Kind = "conversation" | "roleplay";

function levelStyle(level: string | null | undefined, lang: "en" | "ca"): string {
  const beginner = level === "A1" || level === "A2" || !level;
  if (lang === "ca") {
    return beginner
      ? "Escriu amb paraules molt senzilles i frases curtes (nivell A2)."
      : "Escriu en català clar, adaptat al nivell " + level + ".";
  }
  return beginner
    ? "Use very simple words and short sentences (A2 level)."
    : `Use clear English suited to ${level} level.`;
}

/** Prompt del informe: dirigido a la persona ("tú"), en el idioma que aprende y a su nivel. */
export function reportSystem(language: string, level: string | null | undefined, kind: Kind): string {
  const lang = language === "ca" ? "ca" : "en";

  if (lang === "ca") {
    return `Ets Babelito, un coach de català que anima. Escriu un informe breu de la sessió i adreça'l DIRECTAMENT a l'estudiant ("tu"), mai en tercera persona.
${kind === "roleplay" ? "La sessió va ser un joc de rol (una escena)." : "La sessió va ser una conversa lliure."}
${levelStyle(level, "ca")}
Respon NOMÉS amb un únic objecte JSON vàlid, sense markdown ni text addicional:
{
  "summary": "1-2 frases adreçades a l'estudiant",
  "did_well": ["...", "..."],
  "key_errors": [{"error": "el que va dir", "correction": "com s'ha de dir"}],
  "suggested_chunks": ["...", "..."]
}
Normes:
- summary: 1-2 frases en to animador ("Has parlat de… i has…").
- did_well: 2-3 coses concretes que ha fet ELL/ELLA, començant amb un verb ("Has fet servir…").
- key_errors: fins a 3 errors REALS copiats del que va dir l'estudiant, amb la forma correcta. Si no n'hi ha, deixa'l buit [].
- suggested_chunks: fins a 3 expressions naturals en CATALÀ, curtes (3-7 paraules), que encaixin amb el que parlava.
- Fes servir només el que hi ha a la transcripció; no t'inventis res que l'estudiant no hagi dit.`;
  }

  return `You are Babelito, a supportive English coach. Write a short post-session report and speak DIRECTLY TO THE LEARNER ("you"), never about them in the third person.
${kind === "roleplay" ? "The session was a role-play scene." : "The session was a free conversation."}
${levelStyle(level, "en")}
Respond ONLY with a single valid JSON object — no markdown, no extra text:
{
  "summary": "1-2 sentences addressed to the learner",
  "did_well": ["...", "..."],
  "key_errors": [{"error": "what they said", "correction": "what to say"}],
  "suggested_chunks": ["...", "..."]
}
Rules:
- summary: 1-2 encouraging sentences ("You talked about… and you…").
- did_well: 2-3 specific things THEY did, each starting with a verb ("You used…").
- key_errors: up to 3 REAL mistakes copied from what the learner said, with the corrected version. If there were none, return an empty array [].
- suggested_chunks: up to 3 natural expressions that fit what THEY were talking about, short (3-7 words).
- Use only what is in the transcript; never invent things the learner did not say.`;
}

/** Transcripción para el modelo: la charla del coach y, aparte, su feedback sobre cada mensaje. */
export function transcriptText(turns: ChatTurn[]): string {
  return turns
    .map((t) => {
      if (t.role === "user") return `Learner: ${t.content}`;
      const r = splitCoachReply(t.content);
      if (r.legacy || r.feedback.length === 0) return `Coach: ${r.talk}`;
      const fb = r.feedback.map((s) => `${s.title}: ${s.lines.join(" ")}`).join(" | ");
      return `Coach: ${r.talk}\n[Coach feedback on the learner's previous message — ${fb}]`;
    })
    .join("\n");
}

export async function generateReport(
  userId: string,
  sessionId: string | null,
  kind: Kind,
  turns: ChatTurn[],
  language: string,
  level?: string | null
): Promise<SessionReport> {
  const transcript = transcriptText(turns);

  const raw = await askCoach({
    system: reportSystem(language, level, kind),
    messages: [{ role: "user", content: `Session transcript:\n\n${transcript}` }],
    maxTokens: 800,
    temperature: 0.3,
  });

  const parsed = parseAiJson<{
    summary: string;
    did_well: string[];
    key_errors: KeyError[];
    suggested_chunks: string[];
  }>(raw);

  const { data, error } = await supabase
    .from("session_reports")
    .insert({
      user_id: userId,
      session_id: sessionId,
      kind,
      summary: parsed.summary,
      did_well: parsed.did_well ?? [],
      key_errors: parsed.key_errors ?? [],
      suggested_chunks: parsed.suggested_chunks ?? [],
      language,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SessionReport;
}

export async function getReports(userId: string, language: string, limit = 5): Promise<SessionReport[]> {
  const { data } = await scopeByLanguage(
    supabase.from("session_reports").select("*").eq("user_id", userId),
    language
  )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as SessionReport[]) ?? [];
}
