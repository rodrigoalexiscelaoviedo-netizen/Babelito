import { useAuth } from "../context/AuthContext";

export interface VoicePrefs {
  voiceName: string | null;
  voiceRate: number;
  voiceAccent: string;
}

export function useVoicePrefs(): VoicePrefs {
  const { profile } = useAuth();
  const p = profile as unknown as Record<string, unknown>;
  return {
    voiceName: (p?.voice_name as string | null) ?? null,
    voiceRate: (p?.voice_rate as number | null) ?? 0.95,
    voiceAccent: (p?.voice_accent as string | null) ?? "en-GB",
  };
}
