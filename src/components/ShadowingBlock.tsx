import { useState } from "react";
import { Volume2, Mic, Square, Loader2, Pause, Play } from "lucide-react";
import { speak, pauseSpeech, resumeSpeech, speechSupported } from "../lib/speech";
import {
  recognizeSpeech,
  comparePhrases,
  generatePronunciationFeedback,
  savePronunciationError,
} from "../lib/pronunciation";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { useAuth } from "../context/AuthContext";

interface Props {
  text: string;
  lang?: string;
  label?: string;
}

type State = "idle" | "speaking" | "recording" | "processing" | "result" | "tip-loading" | "tip";

// Words too short for the recogniser to reliably catch — skip error-saving for these
const SHORT_WORDS = new Set(["a", "an", "the", "to", "of", "in", "on", "at", "or", "is", "it", "as", "be", "by", "do", "so", "up", "no", "he", "we", "me", "my"]);

export default function ShadowingBlock({ text, lang, label = "Listen & repeat" }: Props) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const effectiveLang = lang ?? voicePrefs.voiceAccent ?? "en-GB";

  const [state, setState] = useState<State>("idle");
  const [paused, setPaused] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [result, setResult] = useState<ReturnType<typeof comparePhrases> | null>(null);
  const [tip, setTip] = useState("");
  const [drillPhrase, setDrillPhrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleListen() {
    speak(text, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate ?? 0.9,
      lang: effectiveLang,
    });
    setState("speaking");
    setPaused(false);
    setSaved(false);
    setResult(null);
    setTip("");
    setError("");
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

  async function handleRecord() {
    if (!speechSupported()) {
      setError("Speech recognition not available in this browser. Try Chrome.");
      return;
    }
    setState("recording");
    setError("");
    setSaved(false);
    setResult(null);
    setTip("");

    const spokenText = await recognizeSpeech(effectiveLang, 20000);
    setState("processing");

    if (!spokenText) {
      setError("Nothing detected — make sure your microphone is on and try again.");
      setState("idle");
      return;
    }

    const cmp = comparePhrases(spokenText, text);
    setSpoken(spokenText);
    setResult(cmp);
    setState("result");

    // Auto-save errors for words > 3 letters
    if (profile && cmp.incorrect.length > 0) {
      const toSave = cmp.incorrect.filter(
        (w) => w.length > 3 && !SHORT_WORDS.has(w.toLowerCase())
      );
      if (toSave.length > 0) {
        await Promise.all(toSave.map((w) => savePronunciationError(profile.id, w)));
        setSaved(true);
      }
    }
  }

  async function handleWhy() {
    if (!result) return;
    const badWords = result.incorrect.join(", ");
    // pick the first mismatched word as the target sound hint
    const targetSound = result.incorrect[0] ?? "";
    setState("tip-loading");
    try {
      const fb = await generatePronunciationFeedback(targetSound, spoken, text);
      setTip(fb.feedback);
      setDrillPhrase(fb.drillPhrase);
      setState("tip");
    } catch {
      setTip(`Focus on the word "${badWords}" — listen carefully and repeat more slowly.`);
      setDrillPhrase("");
      setState("tip");
    }
  }

  function handleRetry() {
    setState("idle");
    setSpoken("");
    setResult(null);
    setTip("");
    setError("");
    setSaved(false);
  }

  const hasIncorrect = result && result.incorrect.length > 0;

  return (
    <div className="border border-ink-600 rounded-xl p-4 space-y-3 bg-ink-800/60">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-paper-faint">{label}</p>
        {saved && (
          <span className="text-[10px] text-mint font-mono">✓ Saved to your drills</span>
        )}
      </div>

      {/* Phrase to repeat */}
      {state === "result" && result ? (
        <div className="flex flex-wrap gap-1.5">
          {result.tokens.map((t, i) => (
            <span
              key={i}
              className={`font-medium text-sm ${t.ok ? "text-mint" : "text-coral underline decoration-wavy"}`}
            >
              {t.word}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium leading-snug text-paper">{text}</p>
      )}

      {spoken && state !== "idle" && (
        <p className="text-xs text-paper-faint italic">You said: "{spoken}"</p>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-coral">{error}</p>}

      {/* Tip panel */}
      {(state === "tip" || state === "tip-loading") && tip && (
        <div className="bg-ink-700 rounded-lg p-3 space-y-1">
          <p className="text-xs text-paper leading-relaxed">{tip}</p>
          {drillPhrase && (
            <p className="text-xs text-gold font-mono">Drill: "{drillPhrase}"</p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Listen */}
        <button
          onClick={state === "speaking" ? handlePauseResume : handleListen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-600 hover:bg-ink-500 text-paper text-xs font-medium transition"
          aria-label={state === "speaking" ? (paused ? "Resume" : "Pause") : "Listen"}
        >
          {state === "speaking" ? (
            paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>
          ) : (
            <><Volume2 size={13} /> Listen</>
          )}
        </button>

        {/* Record */}
        {state === "recording" ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral/20 border border-coral/40 text-coral text-xs animate-pulse">
            <Square size={13} /> Recording…
          </span>
        ) : state === "processing" ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-600 text-paper-muted text-xs">
            <Loader2 size={13} className="animate-spin" /> Processing…
          </span>
        ) : (
          <button
            onClick={handleRecord}
            disabled={!speechSupported()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral text-ink-900 text-xs font-medium hover:bg-coral/90 disabled:opacity-40 transition"
            aria-label="Record"
          >
            <Mic size={13} /> {state === "result" ? "Try again" : "Record"}
          </button>
        )}

        {/* Why? — only when there are errors and not already loading tip */}
        {state === "result" && hasIncorrect && (
          <button
            onClick={handleWhy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-ink-600 hover:bg-ink-500 text-paper-muted hover:text-paper text-xs transition"
          >
            Why?
          </button>
        )}

        {state === "tip-loading" && (
          <span className="flex items-center gap-1 text-xs text-paper-faint">
            <Loader2 size={12} className="animate-spin" /> Getting tip…
          </span>
        )}

        {/* Reset after seeing result */}
        {(state === "result" || state === "tip") && (
          <button
            onClick={handleRetry}
            className="text-xs text-paper-faint hover:text-paper transition ml-auto"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
