import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { ChatTurn } from "./types";

export interface ResumableSession {
  id: string;
  messages: ChatTurn[];
  topic: string | null;
  created_at: string;
}

/**
 * Última conversación sin terminar (últimas 48 h) en la que la persona llegó a
 * escribir al menos un mensaje. Se usa en Conversación (banner "continuar") y
 * en Inicio (tarjeta), para no perder lo hecho aunque se haya salido a mitad.
 */
export function useResumableSession(
  userId: string | undefined,
  hours = 48,
  type: "conversation" | "roleplay" = "conversation"
) {
  const [session, setSession] = useState<ResumableSession | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    supabase
      .from("sessions")
      .select("id, messages, topic, created_at")
      .eq("user_id", userId)
      .eq("session_type", type)
      .eq("completed", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const messages = (data.messages as ChatTurn[] | null) ?? [];
        if (!messages.some((m) => m.role === "user")) return;
        setSession({
          id: data.id as string,
          messages,
          topic: (data.topic as string | null) ?? null,
          created_at: data.created_at as string,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, hours, type]);

  return { session, dismiss: () => setSession(null) };
}
