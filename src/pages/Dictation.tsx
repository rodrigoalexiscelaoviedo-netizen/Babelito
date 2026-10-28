import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Check, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { speak, stopSpeech } from "../lib/speech";
import { awardXp } from "../lib/xp";
import { diffWords, pickSentences, type DiffResult } from "../lib/dictation";

const ROUND_SIZE = 6;

export default function Dictation() {
  const { profile } = useAuth();
  const prefs = useVoicePrefs();
  const [round, setRound] = useState(0);
  const sentences = useMemo(
    () => pickSentences(profile?.current_level, ROUND_SIZE),
    // Una ronda nueva solo cuando se pide; el nivel no debe re-sortear a mitad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round]
  );
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [xp, setXp] = useState<number | null>(null);
  const roundId = useRef<string | null>(null);

  const target = sentences[i];

  function play(slow = false) {
    if (!target) return;
    speak(target, { voiceName: prefs.voiceName ?? undefined, rate: slow ? 0.7 : prefs.voiceRate, lang: prefs.voiceAccent });
  }

  // Reproduce la frase al aparecer cada ejercicio.
  useEffect(() => {
    if (!target || result) return;
    const t = setTimeout(() => play(), 350);
    return () => clearTimeout(t);
    // play depende de preferencias que no deben reiniciar la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => stopSpeech(), []);

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  const finished = i >= sentences.length;

  function check() {
    if (!target || !typed.trim()) return;
    stopSpeech();
    const r = diffWords(target, typed);
    setResult(r);
    setScores((s) => [...s, r.accuracy]);
  }

  function next() {
    const nextIndex = i + 1;
    if (nextIndex >= sentences.length && profile) {
      const all = scores;
      const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
      if (avg >= 50) {
        const amount = 8 + Math.round(avg / 10);
        void awardXp(profile.id, { source: "listening", refKey: `dictation:${(roundId.current ??= String(Date.now()))}`, amount, meta: { avg } });
        setXp(amount);
      }
    }
    setI(nextIndex);
    setTyped("");
    setResult(null);
  }

  function again() {
    roundId.current = null;
    setRound((r) => r + 1);
    setI(0);
    setTyped("");
    setResult(null);
    setScores([]);
    setXp(null);
  }

  if (finished) {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return (
      <div className="animate-fade-up mx-auto max-w-md pt-10 text-center">
        <p className="eyebrow mb-2">Dictation</p>
        <p className={`font-display text-6xl font-extrabold ${avg >= 80 ? "text-mint" : "text-gold"}`}>{avg}%</p>
        <p className="mt-1 text-paper-muted">average accuracy over {scores.length} sentences</p>
        {xp !== null && <p className="mt-3 text-sm text-mint">+{xp} XP</p>}
        <button className="btn-coral mt-6 w-full" onClick={again}>
          New round
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto max-w-xl">
      <p className="eyebrow mb-2">Dictation</p>
      <h1 className="page-title mb-1">Listen and write</h1>
      <p className="mb-6 text-paper-muted">
        Sentence {i + 1} of {sentences.length}. Listen as many times as you need, then type exactly what you hear.
      </p>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => play()} className="btn-coral flex items-center gap-1.5 text-sm" aria-label="Play sentence">
            <Volume2 size={15} /> Play
          </button>
          <button onClick={() => play(true)} className="btn-ghost text-sm" aria-label="Play slowly">
            🐢 Slow
          </button>
        </div>

        <textarea
          className="min-h-[5rem] w-full resize-none rounded-xl border border-ink-600 bg-ink-800 p-3 text-paper placeholder:text-paper-faint focus:border-coral focus:outline-none"
          placeholder="Type what you hear…"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          readOnly={!!result}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!result) check();
            }
          }}
        />

        {result ? (
          <div className="space-y-3">
            <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-base">
              {result.tokens.map((t, k) => (
                <span key={k} className={t.ok ? "font-medium text-mint" : "font-medium text-coral underline decoration-wavy"}>
                  {t.word}
                </span>
              ))}
            </p>
            {result.extra.length > 0 && <p className="text-xs text-paper-muted">Extra words: {result.extra.join(", ")}</p>}
            <p className="flex items-center gap-1.5 text-sm text-paper-muted">
              {result.accuracy === 100 && <Check size={14} className="text-mint" />} {result.accuracy}% correct
            </p>
            <button className="btn-coral w-full" onClick={next}>
              {i + 1 < sentences.length ? "Next sentence" : "See result"}
            </button>
          </div>
        ) : (
          <button className="btn-coral w-full" onClick={check} disabled={!typed.trim()}>
            Check
          </button>
        )}
      </div>
    </div>
  );
}
