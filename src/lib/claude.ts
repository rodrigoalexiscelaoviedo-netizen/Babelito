import { supabase } from "./supabaseClient";
import type { ChatTurn } from "./types";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy-1`;

interface AskOptions {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Manda la conversación al proxy (que a su vez llama a Anthropic).
 * Devuelve el texto plano de la respuesta del coach.
 */
export async function askCoach({ system, messages, maxTokens = 1024, temperature = 0.7 }: AskOptions): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No hay sesión activa.");

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ system, messages, max_tokens: maxTokens, temperature }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Error llamando al coach.");
  return (data.text as string) ?? "";
}
