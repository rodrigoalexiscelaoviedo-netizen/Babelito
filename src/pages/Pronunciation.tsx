import { useState } from "react";
import { Mic, Volume2, Square, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { speak, speechSupported } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import type { Level as AppLevel } from "../lib/types";
import { getPhrasesByLevel, recognizeSpeech, comparePhrases, generatePronunciationFeedback, savePronunciationError, type PronunciationPhrase, type PronunciationFeedback } from "../lib/pronunciation";

type PronLevel = "A2" | "B1" | "B2";
type View = "library" | "practice";

const LEVELS: PronLevel[] = ["A2", "B1", "B2"];

function toPronLevel(l: AppLevel | null | undefined): PronLevel {
  if (l === "A2" || l === "B1" || l === "B2") return l;
  if (l === "A1") return "A2";
  return "B1"; // C1 or unknown → default B1
}

const LEVEL_BADGE: Record<string, string> = {
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-[#F4C431]",
  B2: "bg-coral/20 text-coral",
};

export default function Pronunciation() {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [level, setLevel] = useState<PronLevel>(toPronLevel(profile?.current_level));
  const [view, setView] = useState<View>("library");
  const [active, setActive] = useState<PronunciationPhrase | null>(null);

  const phrases = getPhrasesByLevel(level).slice(0, 5);

  if (view === "practice" && active) {
    return (
      <PracticeView
        phrase={active}
        userId={profile!.id}
        voicePrefs={voicePrefs}
        lang={voicePrefs.voiceAccent || "en-GB"}
        onBack={() => setView("library")}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Pronunciation</p>
      <h1 className="font-display text-3xl font-extrabold mb-2">Train your sounds</h1>
      <p className="text-paper-muted mb-6">
        Listen, record yourself and get instant AI feedback on specific sounds.
      </p>

      {/* Level selector */}
      <div className="flex gap-2 mb-6">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-mono font-medium transition ${
              level === l
                ? "bg-coral text-ink-900"
                : "bg-ink-700 text-paper-muted hover:text-paper"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Phrase cards */}
      <div className="space-y-3">
        {phrases.map((p) => (
          <button
            key={p.id}
            onClick={() => { setActive(p); setView("practice"); }}
            className="card w-full p-5 text-left hover:border-coral/50 transition group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${LEVEL_BADGE[p.level] ?? ""}`}>
                {p.level}
              </span>
              <span className="text-xs text-paper-faint capitalize">{p.difficulty}</span>
            </div>
            <p className="font-display font-bold text-base leading-snug">{p.phrase}</p>
            <p className="text-xs text-paper-muted mt-1">
              Target: <span className="text-coral font-mono">{p.targetSound}</span>
            </p>
          </button>
        ))}
      </div>

      {!speechSupported() && (
        <p className="mt-6 text-xs text-paper-faint text-center">
          Speech recognition is not available in this browser. Try Chrome on desktop or Android.
        </p>
      )}
    </div>
  );
}

// ─── Practice View ──────────────────────────────────────────────────────────

interface PracticeViewProps {
  phrase: PronunciationPhrase;
  userId: string;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  lang: string;
  onBack: () => void;
}

type PracticeState = "idle" | "recording" | "processing" | "result" | "feedback-loading" | "feedback";

function PracticeView({ phrase, userId, voicePrefs, lang, onBack }: PracticeViewProps) {
  const [state, setState] = useState<PracticeState>("idle");
  const [spokenText, setSpokenText] = useState("");
  const [comparison, setComparison] = useState<ReturnType<typeof comparePhrases> | null>(null);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillAttempt, setDrillAttempt] = useState(0);

  function handleListen() {
    speak(phrase.phrase, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate * 0.85, // slightly slower for learning
      lang: voicePrefs.voiceAccent || lang,
    });
  }

  async function handleRecord() {
    if (!speechSupported()) return;
    setState("recording");
    setErrorMessage("");
    const spoken = await recognizeSpeech(lang, 8000);
    setState("processing");

    if (!spoken) {
      setErrorMessage("Nothing detected. Make sure your microphone is on and try again.");
      setState("idle");
      return;
    }

    const result = comparePhrases(spoken, phrase.phrase);
    setSpokenText(spoken);
    setComparison(result);
    setState("result");
  }

  async function handleGetFeedback() {
    if (!comparison) return;
    setState("feedback-loading");
    try {
      const fb = await generatePronunciationFeedback(phrase.targetSound, spokenText, phrase.phrase);
      setFeedback(fb);
      setState("feedback");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not get feedback. Try again.");
      setState("result");
    }
  }

  async function handleSaveErrors() {
    if (!comparison) return;
    for (const word of comparison.incorrect) {
      await savePronunciationError(userId, word);
    }
    setSaved(true);
  }

  function handleReset() {
    setState("idle");
    setSpokenText("");
    setComparison(null);
    setFeedback(null);
    setErrorMessage("");
    setSaved(false);
    setDrillOpen(false);
    setDrillAttempt(0);
  }

  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-paper-muted hover:text-paper transition text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${LEVEL_BADGE[phrase.level] ?? ""}`}>
            {phrase.level}
          </span>
          <p className="text-xs text-paper-muted mt-0.5">
            Target sound: <span className="text-coral font-mono">{phrase.targetSound}</span>
          </p>
        </div>
      </div>

      {/* Phrase display */}
      <div className="card p-6 mb-6 text-center">
        {state === "result" || state === "feedback" || state === "feedback-loading" ? (
          // Show word-by-word comparison
          <div className="flex flex-wrap gap-2 justify-center text-xl font-display font-bold mb-3">
            {comparison?.tokens.map((t, i) => (
              <span
                key={i}
                className={t.ok ? "text-mint" : "text-coral underline decoration-2"}
              >
                {t.word}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-display text-xl font-bold mb-3">{phrase.phrase}</p>
        )}

        {spokenText && (state === "result" || state === "feedback" || state === "feedback-loading") && (
          <p className="text-sm text-paper-muted italic">You said: "{spokenText}"</p>
        )}

        {state === "result" && comparison && (
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-mint">
              <CheckCircle2 size={14} /> {comparison.correct.length} correct
            </span>
            <span className="flex items-center gap-1 text-coral">
              <XCircle size={14} /> {comparison.incorrect.length} incorrect
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-coral text-sm text-center mb-4">{errorMessage}</p>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {/* Listen */}
        <button
          onClick={handleListen}
          className="btn-ghost w-full flex items-center justify-center gap-2"
        >
          <Volume2 size={16} /> Listen to target phrase
        </button>

        {/* Record / processing */}
        {(state === "idle" || state === "result" || state === "feedback") && (
          <button
            onClick={handleRecord}
            disabled={!speechSupported()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral text-ink-900 font-medium hover:bg-coral/90 disabled:opacity-40 transition"
          >
            <Mic size={16} />
            {state === "idle" ? "Record my pronunciation" : "Try again"}
          </button>
        )}

        {state === "recording" && (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral animate-pulse">
            <Square size={16} /> Recording… speak now
          </div>
        )}

        {state === "processing" && (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-700 text-paper-muted">
            <Loader2 size={16} className="animate-spin" /> Processing…
          </div>
        )}

        {/* Get AI feedback */}
        {state === "result" && comparison && comparison.incorrect.length > 0 && (
          <button
            onClick={handleGetFeedback}
            className="btn-coral w-full flex items-center justify-center gap-2"
          >
            Get AI feedback on "{phrase.targetSound}" →
          </button>
        )}

        {state === "feedback-loading" && (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-700 text-paper-muted">
            <Loader2 size={16} className="animate-spin" /> Getting tips…
          </div>
        )}

        {/* Feedback panel */}
        {state === "feedback" && feedback && (
          <div className="card p-5 space-y-4">
            <div>
              <p className="eyebrow text-coral mb-2">Sound tips</p>
              <p className="text-sm text-paper leading-relaxed">{feedback.feedback}</p>
            </div>
            <div>
              <p className="eyebrow text-gold mb-2">Drill phrase</p>
              <p className="font-display font-bold">{feedback.drillPhrase}</p>
            </div>
            <button
              onClick={() => setDrillOpen(true)}
              className="btn-coral w-full"
            >
              Practice this drill →
            </button>
          </div>
        )}

        {/* Save errors */}
        {(state === "result" || state === "feedback") && comparison && comparison.incorrect.length > 0 && (
          <button
            onClick={handleSaveErrors}
            disabled={saved}
            className="w-full text-sm text-paper-muted hover:text-paper transition disabled:opacity-60"
          >
            {saved ? "✅ Saved for your future drills" : "Save errors for coach tracking"}
          </button>
        )}

        {/* Reset */}
        {(state === "result" || state === "feedback") && (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-paper-faint hover:text-paper transition"
          >
            <RefreshCw size={13} /> Start over with same phrase
          </button>
        )}
      </div>

      {/* Drill modal */}
      {drillOpen && feedback && (
        <DrillModal
          drillPhrase={feedback.drillPhrase}
          userId={userId}
          voicePrefs={voicePrefs}
          lang={lang}
          targetSound={phrase.targetSound}
          attempt={drillAttempt}
          onAttempt={() => setDrillAttempt((n) => n + 1)}
          onClose={() => setDrillOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Drill Modal ─────────────────────────────────────────────────────────────

interface DrillModalProps {
  drillPhrase: string;
  userId: string;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  lang: string;
  targetSound: string;
  attempt: number;
  onAttempt: () => void;
  onClose: () => void;
}

function DrillModal({ drillPhrase, userId, voicePrefs, lang, targetSound, attempt, onAttempt, onClose }: DrillModalProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof comparePhrases> | null>(null);
  const [saved, setSaved] = useState(false);
  const MAX_ATTEMPTS = 3;

  function handleListen() {
    speak(drillPhrase, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: (voicePrefs.voiceRate ?? 0.95) * 0.8,
      lang: voicePrefs.voiceAccent || lang,
    });
  }

  async function handleRecord() {
    if (attempt >= MAX_ATTEMPTS) return;
    setRecording(true);
    const spoken = await recognizeSpeech(lang, 7000);
    setRecording(false);
    if (!spoken) return;
    setProcessing(true);
    const result = comparePhrases(spoken, drillPhrase);
    setLastResult(result);
    onAttempt();
    setProcessing(false);
    // Auto-save errors on incorrect words
    if (result.incorrect.length > 0) {
      for (const word of result.incorrect) {
        await savePronunciationError(userId, word);
      }
      setSaved(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-ink-900/80 backdrop-blur">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold">Drill: "{targetSound}"</p>
          <button onClick={onClose} className="text-paper-muted hover:text-paper text-sm">
            Close
          </button>
        </div>

        <p className="font-display text-xl font-bold text-center">{drillPhrase}</p>

        <div className="flex items-center gap-2 text-xs text-paper-muted justify-center">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full ${
                i < attempt ? "bg-coral" : "bg-ink-600"
              }`}
            />
          ))}
          <span>{attempt}/{MAX_ATTEMPTS} attempts</span>
        </div>

        {lastResult && (
          <div className="flex flex-wrap gap-2 justify-center text-lg font-display font-bold">
            {lastResult.tokens.map((t, i) => (
              <span key={i} className={t.ok ? "text-mint" : "text-coral"}>
                {t.word}
              </span>
            ))}
          </div>
        )}

        {saved && (
          <p className="text-xs text-paper-faint text-center">✅ Saved for your future drills</p>
        )}

        <button onClick={handleListen} className="btn-ghost w-full flex items-center justify-center gap-2">
          <Volume2 size={15} /> Listen
        </button>

        {recording ? (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral/20 border border-coral/40 text-coral animate-pulse">
            <Square size={15} /> Recording…
          </div>
        ) : processing ? (
          <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-700 text-paper-muted">
            <Loader2 size={15} className="animate-spin" /> Processing…
          </div>
        ) : attempt < MAX_ATTEMPTS ? (
          <button
            onClick={handleRecord}
            disabled={!speechSupported()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral text-ink-900 font-medium hover:bg-coral/90 disabled:opacity-40 transition"
          >
            <Mic size={15} /> Record attempt {attempt + 1}
          </button>
        ) : (
          <button onClick={onClose} className="btn-coral w-full">
            Done — back to practice
          </button>
        )}
      </div>
    </div>
  );
}
