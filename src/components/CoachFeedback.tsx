import { useState } from "react";
import { Check, ChevronDown, Lightbulb, Volume2 } from "lucide-react";
import {
  feedbackKind,
  parsePronunciationLine,
  type FeedbackKind,
  type FeedbackSection,
} from "../lib/coachFormat";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";

const LABEL_COLOR: Record<FeedbackKind, string> = {
  correction: "text-coral",
  natural: "text-mint",
  variant: "text-gold",
  tip: "text-gold",
  pronunciation: "text-mint",
  other: "text-paper-muted",
};

/** "Perfect — nothing to correct." / "Perfecte — res a corregir." */
function isPerfect(line: string): boolean {
  return /^(perfect|perfecte|perfecto)\b/i.test(line.trim());
}

/**
 * Feedback sobre tu último mensaje, separado de lo que el coach dice.
 * Plegable: el último mensaje llega abierto, los anteriores plegados con
 * la corrección como resumen, para que el historial se pueda recorrer.
 */
export default function CoachFeedback({
  sections,
  defaultOpen,
  language,
}: {
  sections: FeedbackSection[];
  defaultOpen: boolean;
  language: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const prefs = useVoicePrefs();
  const ca = language === "ca";

  if (sections.length === 0) return null;

  const correction = sections.find((s) => feedbackKind(s.title) === "correction");
  const preview = correction?.lines[0] ?? sections[0].lines[0];
  const perfect = !!correction && isPerfect(correction.lines[0] ?? "");

  function play(text: string) {
    speak(text, {
      voiceName: prefs.voiceName ?? undefined,
      rate: prefs.voiceRate,
      lang: prefs.voiceAccent,
    });
  }

  return (
    <div className="mt-2 rounded-xl2 border border-ink-600 bg-ink-800/60 max-w-[85%]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {perfect ? (
          <Check size={14} className="shrink-0 text-mint" />
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-coral">
            Feedback
          </span>
        )}
        <span className={`min-w-0 flex-1 truncate text-xs ${perfect ? "text-mint" : "text-paper-muted"}`}>
          {open ? (ca ? "Sobre el teu missatge" : "On your message") : preview}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-paper-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-ink-600 px-3 py-3">
          {sections.map((section) => {
            const kind = feedbackKind(section.title);
            return (
              <div key={section.title}>
                <p className={`mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${LABEL_COLOR[kind]}`}>
                  {kind === "tip" && <Lightbulb size={11} />}
                  {section.title}
                </p>

                {kind === "pronunciation" ? (
                  <ul className="space-y-1.5">
                    {section.lines.map((line) => {
                      const entry = parsePronunciationLine(line);
                      if (!entry) return <li key={line} className="text-sm text-paper">{line}</li>;
                      return (
                        <li key={line} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <button
                            type="button"
                            onClick={() => play(entry.word)}
                            className="inline-flex items-center gap-1 rounded-lg bg-ink-600 px-2 py-1 text-sm font-semibold text-paper hover:bg-ink-500"
                            aria-label={ca ? `Escolta "${entry.word}"` : `Listen to "${entry.word}"`}
                          >
                            <Volume2 size={12} className="text-coral" /> {entry.word}
                          </button>
                          <span className="font-mono text-xs text-paper-muted">{entry.ipa}</span>
                          {entry.phrase && (
                            <button
                              type="button"
                              onClick={() => play(entry.phrase)}
                              className="text-sm text-paper-muted underline decoration-dotted underline-offset-4 hover:text-paper"
                              aria-label={ca ? `Escolta la frase "${entry.phrase}"` : `Listen to the phrase "${entry.phrase}"`}
                            >
                              {entry.phrase}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  section.lines.map((line) => (
                    <p
                      key={line}
                      className={`text-sm leading-relaxed ${
                        kind === "correction" && isPerfect(line) ? "text-mint" : "text-paper"
                      }`}
                    >
                      {line}
                    </p>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
