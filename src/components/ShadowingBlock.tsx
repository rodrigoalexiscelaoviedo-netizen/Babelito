import { useEffect, useRef, useState } from "react";
import { Volume2, Mic, CheckCircle2, Loader2, Pause, Play } from "lucide-react";
import { speak, pauseSpeech, resumeSpeech, speechSupported } from "../lib/speech";
import { comparePhrases, generatePronunciationFeedback, savePronunciationError } from "../lib/pronunciation";
import { useSpeechCapture } from "../lib/useSpeechCapture";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { useAuth } from "../context/AuthContext";
import {
  assessAvailable,
  assessPronunciation,
  startAudioCapture,
  wordTone,
  type AudioCapture,
  type PronunciationScore,
} from "../lib/pronunciationAssess";

const TONE_CLASS = { good: "text-mint", fair: "text-gold", poor: "text-coral underline decoration-wavy" } as const;

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

  // Si se pasa lang como prop (override), usarlo; si no, usa learning_language del usuario
  const learningLanguage = lang ? "en" : (profile?.learning_language || "en");

  const voiceRec = useSpeechCapture(
    learningLanguage,
    profile?.english_variant ?? undefined,
    { mode: "turn" }
  );

  const [state, setState] = useState<State>("idle");
  const [paused, setPaused] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [result, setResult] = useState<ReturnType<typeof comparePhrases> | null>(null);
  const [tip, setTip] = useState("");
  const [drillPhrase, setDrillPhrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // Puntaje real (Azure). null = no disponible o todavía calculando.
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [scoring, setScoring] = useState(false);
  const captureRef = useRef<AudioCapture | null>(null);

  // Consulta la disponibilidad al montar, para que al tocar Record no se pierda el inicio del audio.
  useEffect(() => {
    if (learningLanguage === "en") void assessAvailable();
  }, [learningLanguage]);

  // Libera el micrófono si se desmonta a mitad de una grabación.
  useEffect(() => () => captureRef.current?.cancel(), []);

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

  function handleListen(slow = false) {
    speak(text, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: slow ? 0.7 : voicePrefs.voiceRate ?? 0.9,
      lang: voicePrefs.voiceAccent ?? "en-GB",
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
    setScore(null);
    setTip("");
    setState("recording");
    // Audio en paralelo al reconocimiento, para el puntaje real (solo inglés).
    captureRef.current?.cancel();
    captureRef.current = null;
    const capturePromise: Promise<AudioCapture | null> =
      learningLanguage === "en"
        ? assessAvailable().then((ok) => (ok ? startAudioCapture() : null))
        : Promise.resolve(null);
    void capturePromise.then((c) => {
      captureRef.current = c;
    });
    voiceRec.start(async (spokenText, errorCode) => {
      // Punto de salida único del hook: Done, corte fatal o timeout de 30 s.
      setState("processing");
      const capture = (await capturePromise) ?? captureRef.current;
      captureRef.current = null;
      if (!spokenText.trim()) {
        capture?.cancel();
        setError(
          errorCode === "not-allowed" || errorCode === "service-not-allowed"
            ? "Microphone blocked — enable the permission in your browser."
            : errorCode === "audio-capture"
            ? "No microphone detected."
            : "Nothing detected — make sure your microphone is on and try again."
        );
        setState("idle");
        return;
      }
      const cmp = comparePhrases(spokenText, text);
      setSpoken(spokenText);
      setResult(cmp);
      setState("result");
      if (capture) {
        setScoring(true);
        void capture
          .stop()
          .then((wav) => (wav ? assessPronunciation(wav, text, voicePrefs.voiceAccent ?? "en-GB") : null))
          .then(setScore)
          .finally(() => setScoring(false));
      }
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
    setScore(null);
  }

  // Los puntajes por palabra de Azure se alinean con la frase si coinciden en cantidad.
  const azureWords = score?.words.filter((w) => w.errorType !== "Insertion") ?? [];
  const useAzureTones = !!result && azureWords.length === result.tokens.length;

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
              className={`font-medium text-sm ${
                useAzureTones ? TONE_CLASS[wordTone(azureWords[i])] : t.ok ? "text-mint" : "text-coral underline decoration-wavy"
              }`}
            >
              {t.word}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium leading-snug text-paper">{text}</p>
      )}

      {(scoring || score) && state !== "idle" && state !== "recording" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {score ? (
            <>
              <span className="font-mono text-paper">
                Pronunciation <strong className="text-mint">{score.overall}</strong>/100
              </span>
              <span className="text-paper-muted">Accuracy {score.accuracy}</span>
              <span className="text-paper-muted">Fluency {score.fluency}</span>
              <span className="text-paper-muted">Complete {score.completeness}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-paper-faint">
              <Loader2 size={12} className="animate-spin" /> Scoring your pronunciation…
            </span>
          )}
        </div>
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
          onClick={state === "speaking" ? handlePauseResume : () => handleListen()}
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

        {state !== "speaking" && state !== "recording" && (
          <button
            onClick={() => handleListen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-ink-600 hover:bg-ink-500 text-paper-muted hover:text-paper text-xs font-medium transition"
            aria-label="Listen slowly"
          >
            🐢 Slow
          </button>
        )}

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
