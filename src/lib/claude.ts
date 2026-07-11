import { supabase } from "./supabaseClient";
import type { ChatTurn } from "./types";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-proxy`;

interface AskOptions {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}

/** Thrown when Gemini is overloaded — the caller can show a retry button. */
export class RetryableError extends Error {
  readonly retryable = true;
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

/**
 * Manda la conversación al proxy (que a su vez llama a Gemini).
 * Lanza RetryableError si la Edge Function indica que el servicio está saturado.
 */
export async function askCoach({ system, messages, maxTokens = 1024, temperature = 0.7 }: AskOptions): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No hay sesión activa.");

  let res: Response;
  try {
    res = await fetch(FUNCTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ system, messages, max_tokens: maxTokens, temperature }),
      signal: AbortSignal.timeout(32000),
    });
  } catch (fetchErr: unknown) {
    const isTimeout =
      fetchErr instanceof Error &&
      (fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError");
    throw new RetryableError(
      isTimeout
        ? "El coach tardó demasiado. Intentá de nuevo."
        : "No se pudo conectar con el coach."
    );
  }

  const data = await res.json();

  if (!res.ok) {
    // Edge Function signals a retryable overload (503/429 + { retryable: true })
    if (data?.retryable === true) {
      throw new RetryableError(
        data.error ?? "El coach está con mucha demanda ahora mismo."
      );
    }
    throw new Error(data?.error ?? "Error llamando al coach.");
  }

  return (data.text as string) ?? "";
}
