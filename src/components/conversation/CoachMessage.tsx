import { useState } from "react";
import { Volume2, Pause, Play } from "lucide-react";
import { speak, pauseSpeech, resumeSpeech } from "../../lib/speech";
import { splitCoachReply, spokenPart } from "../../lib/coachFormat";
import type { VoicePrefs } from "../../lib/useVoicePrefs";

export default function CoachMessage({
  text,
  variant,
  voicePrefs,
}: {
  text: string;
  variant: string;
  voicePrefs: VoicePrefs;
}) {
  const [paused, setPaused] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const reply = splitCoachReply(text);

  function handleSpeak() {
    // Solo se lee lo que el coach DICE; el feedback tiene su propia tarjeta.
    speak(spokenPart(text), {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent || (variant === "American" ? "en-US" : "en-GB"),
    });
    setSpeaking(true);
    setPaused(false);
  }

  function handlePauseResume() {
    if (paused) {
      resumeSpeech();
      setPaused(false);
    } else {
      pauseSpeech();
      setPaused(true);
    }
  }

  return (
    <div>
      <div className="flex justify-end gap-1 mb-1">
        {speaking && (
          <button
            onClick={handlePauseResume}
            className="text-paper-faint hover:text-mint transition"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        )}
        <button
          onClick={handleSpeak}
          className="text-paper-faint hover:text-coral transition"
          aria-label="Read aloud"
        >
          <Volume2 size={15} />
        </button>
      </div>
      {reply.legacy
        ? text.split("\n").map((line, i) => {
            // Sesiones guardadas con el formato antiguo: encabezados mezclados con la charla.
            const bold = line.match(/\*\*(.+?)\*\*/);
            if (bold) {
              return (
                <p key={i} className="mt-2 font-mono text-xs uppercase tracking-wider text-coral">
                  {bold[1]}
                </p>
              );
            }
            if (line.startsWith("→")) {
              return (
                <p key={i} className="text-paper">
                  {line.replace("→", "").trim()}
                </p>
              );
            }
            return line.trim() ? (
              <p key={i} className="text-paper">
                {line}
              </p>
            ) : null;
          })
        : reply.talk.split("\n").map((line, i) =>
            line.trim() ? (
              <p key={i} className="text-paper">
                {line}
              </p>
            ) : null
          )}
    </div>
  );
}