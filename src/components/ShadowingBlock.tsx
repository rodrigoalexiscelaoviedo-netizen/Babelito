import { useEffect, useRef, useState } from "react";
import { Volume2, Mic, CheckCircle2, Loader2, Pause, Play } from "lucide-react";
import { speak, pauseSpeech, resumeSpeech, speechSupported } from "../lib/speech";
import { comparePhrases, generatePronunciationFeedback, savePronunciationError } from "../lib/pronunciation";
import { useTurnRecorder } from "../lib/useTurnRecorder";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { useAuth } from "../context/AuthContext";

interface Props {
  text: string;
  lang?: string;
  label?: string;
}

type State = "idle" | "speaking" | "recording" | "processing" | "result" | "tip-loading" | "tip";

const SHORT_WORDS = new Set(["a", "an", "the", "to", "of", "in", "on", "at", "or", "is", "it", "as", "be", "by", "do", "so", "up", "no", "he", "we", "me", "my"]);

export default function ShadowingBlock({ text, lang, label = "Listen & repeat" }: Props) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const effectiveLang = lang ?? voicePrefs.voiceAccent ?? "en-GB";
  const voiceRec = useTurnRecorder(effectiveLang);

  const [state, setState] = useState<State>("idle");
  const [paused, setPaused] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [result, setResult] = useState<ReturnType<typeof comparePhrases> | null>(null);
  const [tip, setTip] = useState("");
  const [drillPhrase, setDrillPhrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeout de seguridad: 30s → stop() dispara onend que llama el callback
  useEffect(() => {
    if (state === "recording") {
      doneTimeoutRef.current = setTimeout(() => voiceRec.stop(), 30000);
    } else {
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    }
    return () => { if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
    if (paused) { resumeSpeech(); setPaused(false); }
    else { pauseSpeech(); setPaused(true); }
  }

  function handleRecord() {
    if (!speechSupported()) {
      setError("Speech recognition not available in this browser. Try Chrome.");
      return;
    }
    setError("");
    setSaved(false);
    setResult(null);
    setTip("");
    setState("recording");
    voiceRec.start(async (spokenText, _errorCode) => {
      // onend is the sole exit point — fires on silence, timeout, or Done button
      setState("processing");
      if (!spokenText.trim()) {
        setError("Nothing detected — make sure your microphone is on and try again.");
        setState("idle");
        return;
      }
      const cmp = comparePhrases(spokenText, text);
      setSpoken(spokenText);
      setResult(cmp);
      setState("result");
      if (profile && cmp.incorrect.length > 0) {
        const toSave = cmp.incorrect.filter(
          (w) => w.length > 3 && !SHORT_WORDS.has(w.toLowerCase())
        );
        if (toSave.length > 0) {
          await Promise.all(toSave.map((w) => savePronunciationError(profile.id, w)));
          setSaved(true);
        }
      }
    });
  }

  function handleDone() {
    // stop() triggers onend which calls the callback set in handleRecord
    voiceRec.stop();
  }

  async function handleWhy() {
    if (!result) return;
    const targetSound = result.incorrect[0] ?? "";
    setState("tip-loading");
    try {
      const fb = await generatePronunciationFeedback(targetSound, spoken, text);
      setTip(fb.feedback);
      setDrillPhrase(fb.drillPhrase);
      setState("tip");
    } catch {
      setTip(`Focus on the word "${result.incorrect.join(", ")}" — listen carefully and repeat more slowly.`);
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

      {/* Phrase / interim / result */}
      {state === "recording" ? (
        <p className="text-sm font-medium leading-snug text-paper-muted italic min-h-[1.25rem]">
          {voiceRec.interim || "Listening…"}
        </p>
      ) : state === "result" && result ? (
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

      {spoken && state !== "idle" && state !== "recording" && (
        <p className="text-xs text-paper-faint italic">You said: "{spoken}"</p>
      )}

      {error && <p className="text-xs text-coral">{error}</p>}

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
          disabled={state === "recording"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-600 hover:bg-ink-500 text-paper text-xs font-medium transition disabled:opacity-40"
          aria-label={state === "speaking" ? (paused ? "Resume" : "Pause") : "Listen"}
        >
          {state === "speaking" ? (
            paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>
          ) : (
            <><Volume2 size={13} /> Listen</>
          )}
        </button>

        {/* Record / Done / Processing */}
        {state === "recording" ? (
          <>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coral/20 border border-coral/40 text-coral text-xs animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Recording…
            </span>
            <button
              onClick={handleDone}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mint text-ink-900 text-xs font-semibold hover:bg-mint/90 transition"
            >
              <CheckCircle2 size={13} /> Done ✓
            </button>
          </>
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
