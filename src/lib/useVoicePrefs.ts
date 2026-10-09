import { useAuth } from "../context/AuthContext";

export interface VoicePrefs {
  voiceName: string | null;
  voiceRate: number;
  /** BCP-47 tag for the language being spoken. Always matches learning_language. */
  voiceAccent: string;
}

/** Idioma de la app que se aprende → tag BCP-47 de la voz que debe hablarlo. */
export const TARGET_TTS_LANG = {
  en: "en-GB",
  ca: "ca-ES",
} as const;

/**
 * Preferencias de voz del usuario. El acento elegido en Perfil solo aplica a
 * inglés: con learning_language='ca' el TTS SIEMPRE usa ca-ES, nunca una voz
 * inglesa (antes el default en-GB leía textos catalanes en inglés).
 */
export function useVoicePrefs(): VoicePrefs {
  const { profile } = useAuth();
  const p = profile as unknown as Record<string, unknown> | null;
  const language = profile?.learning_language === "ca" ? "ca" : "en";

  return {
    voiceName: (p?.voice_name as string | null) ?? null,
    voiceRate: (p?.voice_rate as number | null) ?? 0.95,
    voiceAccent: language === "ca"
      ? TARGET_TTS_LANG.ca
      : ((p?.voice_accent as string | null) ?? TARGET_TTS_LANG.en),
  };
}
