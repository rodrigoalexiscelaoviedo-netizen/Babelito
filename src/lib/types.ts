export type Level = "A1" | "A2" | "B1" | "B2" | "C1";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  native_language: string | null;
  learning_goal: string | null;
  self_assessed_level: string | null;
  diagnosed_level: string | null;
  current_level: Level | null;
  target_level: Level | null;
  english_variant: string | null;
  onboarding_complete: boolean;
  diagnostic_complete: boolean;
  profile_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SessionType = "conversation" | "roleplay" | "text_correction";
export type Mood = "confident" | "neutral" | "stuck";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_type: SessionType;
  topic: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  mood: Mood | null;
  messages: ChatTurn[];
  summary: string | null;
  created_at: string;
}

export interface DetectedError {
  id: string;
  user_id: string;
  session_id: string | null;
  error_type: string;
  original_text: string | null;
  correction: string | null;
  explanation: string | null;
  created_at: string;
}

export interface Chunk {
  id: number;
  category: string;
  english: string;
  spanish: string;
  example: string | null;
  british_version: string | null;
}

export interface DiagnosticAnswer {
  question_id: number;
  chosen: number;
  correct: boolean;
  level: Level;
}
