import { supabase } from "./supabaseClient";
import { askCoach } from "./claude";
import type { ChatTurn } from "./types";

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

const REPORT_SYSTEM = `You are an English learning coach writing a post-session report.
Analyse the conversation transcript and respond ONLY with a single valid JSON object — no markdown, no extra text:
{
  "summary": "1-2 sentence summary of the session",
  "did_well": ["strength 1", "strength 2", "strength 3"],
  "key_errors": [
    {"error": "what the learner said", "correction": "what they should say"}
  ],
  "suggested_chunks": ["expression 1", "expression 2", "expression 3"]
}
Rules:
- summary: 1-2 sentences, encouraging tone
- did_well: 2-3 specific strengths observed
- key_errors: up to 3 mistakes with exact corrections, prioritise grammar/vocabulary
- suggested_chunks: up to 3 natural English expressions they could have used`;

function transcriptText(turns: ChatTurn[]): string {
  return turns
    .map((t) => `${t.role === "user" ? "Learner" : "Coach"}: ${t.content}`)
    .join("\n");
}

export async function generateReport(
  userId: string,
  sessionId: string | null,
  kind: "conversation" | "roleplay",
  turns: ChatTurn[]
): Promise<SessionReport> {
  const transcript = transcriptText(turns);

  const raw = await askCoach({
    system: REPORT_SYSTEM,
    messages: [{ role: "user", content: `Session transcript:\n\n${transcript}` }],
    maxTokens: 800,
    temperature: 0.3,
  });

  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Invalid report format from AI");

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    summary: string;
    did_well: string[];
    key_errors: KeyError[];
    suggested_chunks: string[];
  };

  const { data, error } = await supabase
    .from("session_reports")
    .insert({
      user_id: userId,
      session_id: sessionId,
      kind,
      summary: parsed.summary,
      did_well: parsed.did_well,
      key_errors: parsed.key_errors,
      suggested_chunks: parsed.suggested_chunks,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SessionReport;
}

export async function getReports(userId: string, limit = 5): Promise<SessionReport[]> {
  const { data } = await supabase
    .from("session_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as SessionReport[]) ?? [];
}
