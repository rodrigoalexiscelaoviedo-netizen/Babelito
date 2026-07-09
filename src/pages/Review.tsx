import { useEffect, useRef, useState } from "react";
import { Mic, Volume2, CheckCircle2, XCircle, ArrowRight, BookOpen, Library } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDueItems, applyReview, type ReviewItem, type ReviewQuality } from "../lib/srs";
import { speak, speechSupported } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { comparePhrases } from "../lib/pronunciation";
import { useSingleUtterance } from "../lib/useSingleUtterance";
import Loader from "../components/Loader";
import Maica from "../components/Maica";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { askCoach } from "../lib/claude";
import { BrandDots } from "../components/Loader";

type SessionState = "loading" | "empty" | "prompt" | "recording" | "result" | "done";

export default function Review() {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<SessionState>("loading");
  const [spoken, setSpoken] = useState("");
  const [quality, setQuality] = useState<ReviewQuality | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);

  const voiceRec = useSingleUtterance(voicePrefs.voiceAccent ?? "en-GB");
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeout de seguridad: 30s → stop automático (onend dispara el callback)
  useEffect(() => {
    if (phase === "recording") {
      doneTimeoutRef.current = setTimeout(() => voiceRec.stop(), 30000);
    } else {
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    }
    return () => { if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Hint pasivo ──────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;
    getDueItems(profile.id).then((due) => {
      setItems(due);
      setPhase(due.length === 0 ? "empty" : "prompt");
    });
  }, [profile]);

  const item = items[idx] ?? null;
  const total = items.length;

  // Arrancar timer de hint en "prompt" phase
  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setShowHint(false);
    setHintText("");
    if (phase === "prompt") {
      hintTimerRef.current = setTimeout(() => setShowHint(true), 11000);
    }
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [phase, idx]);

  async function getHint() {
    if (!item || !profile) return;
    setHintLoading(true);
    try {
      const hint = await askCoach({
        system: `You are a memory coach. The student needs to recall an English phrase.
Give ONE very short hint (max 10 words): a rhyme, first letter, or structural clue.
NEVER reveal the answer. Reply with only the hint text.`,
        messages: [{ role: "user", content: `The student needs to say in English: "${item.prompt}". Give a hint (don't reveal: "${item.content}").` }],
        maxTokens: 40,
      });
      setHintText(hint.trim().replace(/^["']|["']$/g, ""));
    } catch {
      setHintText(`Starts with: "${item.content[0].toUpperCase()}…"`);
    } finally {
      setHintLoading(false);
    }
  }

  function handleRecord() {
    if (!item) return;
    setShowHint(false);
    setHintText("");
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    // Capturar item.content en el closure — idx no cambia mientras se graba
    const expected = item.content;
    setPhase("recording");
    voiceRec.start((text, _errorCode) => {
      // Único punto de salida: onend del hook (por silencio, timeout, o botón Done)
      if (!text.trim()) {
        setSpoken("");
        setQuality("again");
      } else {
        const cmp = comparePhrases(text, expected);
        setSpoken(text);
        setQuality(cmp.incorrect.length === 0 ? "good" : "again");
      }
      setPhase("result");
    });
  }

  function handleDone() {
    // Detiene la captura — onend del hook dispara el callback con el texto acumulado
    voiceRec.stop();
  }

  function handleListen() {
    if (!item) return;
    speak(item.content, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate ?? 0.85,
      lang: voicePrefs.voiceAccent ?? "en-GB",
    });
  }

  async function handleNext() {
    if (!item || !quality || !profile) return;

    await applyReview(item.id, item, quality);
    setReviewedCount((c) => c + 1);

    const nextIdx = idx + 1;
    if (nextIdx >= total) {
      setPhase("done");
      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
    } else {
      setIdx(nextIdx);
      setSpoken("");
      setQuality(null);
      setPhase("prompt");
    }
  }

  // ─── Empty ────────────────────────────────────────────────────────────────
  if (phase === "loading") return <Loader />;

  if (phase === "empty") {
    return (
      <div className="animate-fade-up max-w-md mx-auto pt-12">
        <div className="card p-8 text-center">
          <Maica mood="curious" size="md" className="mx-auto mb-2" />
          <h1 className="font-display text-2xl font-extrabold mb-2">Tu mazo está listo</h1>
          <p className="text-paper-muted text-sm mb-6">
            No hay repasos pendientes hoy. Agregá chunks o palabras para seguir practicando hablado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/chunks" className="btn-mint text-sm">
              <Library size={15} /> Chunks library
            </Link>
            <Link to="/reading" className="btn-ghost text-sm">
              <BookOpen size={15} /> Reading <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Done ─────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <>
        <AchievementCelebration
          achievements={newAchievements}
          onClose={() => {
            if (profile) markSeen(profile.id, newAchievements.map((a) => a.key));
            setNewAchievements([]);
          }}
        />
        <div className="animate-fade-up max-w-md mx-auto text-center pt-16">
          <CheckCircle2 size={48} className="mx-auto text-mint mb-4" />
          <h1 className="font-display text-3xl font-extrabold mb-2">Done!</h1>
          <p className="text-paper-muted mb-1">
            <span className="font-display font-bold text-mint text-xl">{reviewedCount}</span> item
            {reviewedCount !== 1 ? "s" : ""} reviewed.
          </p>
          <p className="text-sm text-paper-faint mt-1">Come back tomorrow to keep your streak.</p>
        </div>
      </>
    );
  }

  if (!item) return null;

  // ─── Session ──────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">Oral review</p>
          <h1 className="font-display text-2xl font-extrabold">Say it out loud</h1>
        </div>
        <span className="text-sm font-mono text-paper-muted">
          {idx + 1} / {total}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-ink-600 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-all"
          style={{ width: `${((idx) / total) * 100}%` }}
        />
      </div>

      {/* Prompt card */}
      <div className="card p-6 mb-4">
        <p className="eyebrow mb-3">
          {item.item_type === "chunk" ? "Chunk" : "Word"}
        </p>
        <p className="font-display text-2xl font-semibold text-paper">{item.prompt}</p>
        <p className="text-xs text-paper-faint mt-2 italic">
          How do you say this in English?
        </p>
      </div>

      {/* Record button — only in prompt phase */}
      {phase === "prompt" && (
        <>
          <button
            onClick={handleRecord}
            disabled={!speechSupported()}
            className="btn-coral w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-40"
          >
            <Mic size={20} /> Say it
          </button>

          {/* ── Hint pasivo ── */}
          {showHint && (
            <div className="animate-fade-up">
              <div className="card px-3 py-2.5 border-gold/30 text-center">
                {hintText ? (
                  <>
                    <p className="text-[10px] text-gold font-mono uppercase tracking-widest mb-1">💡 Hint</p>
                    <p className="text-sm text-paper-muted">{hintText}</p>
                  </>
                ) : (
                  <button
                    onClick={getHint}
                    disabled={hintLoading}
                    className="flex items-center justify-center gap-2 text-xs text-paper-faint hover:text-gold transition w-full disabled:opacity-60"
                  >
                    {hintLoading ? <BrandDots /> : <span>💡</span>}
                    {hintLoading ? "Getting hint…" : "Need a hint?"}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recording indicator + Done button (Modo B) */}
      {phase === "recording" && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-coral/10 border border-coral/30">
            <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
            <span className="text-coral font-medium text-sm">Recording… speak now</span>
          </div>
          {voiceRec.interim && (
            <p className="text-center text-sm text-paper-muted italic">
              {voiceRec.interim}
            </p>
          )}
          <button
            onClick={handleDone}
            className="btn-mint w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            <CheckCircle2 size={18} /> Done — compare
          </button>
        </div>
      )}

      {/* Result */}
      {phase === "result" && quality && (
        <div className="animate-fade-up space-y-4">
          {/* What you said */}
          {spoken && (
            <p className="text-xs text-paper-faint italic text-center">
              You said: "{spoken}"
            </p>
          )}
          {!spoken && (
            <p className="text-xs text-coral text-center">Nothing detected — mic issue or timeout.</p>
          )}

          {/* Reveal */}
          <div
            className={`card p-5 border ${
              quality === "good" ? "border-mint/40" : "border-coral/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1">Answer</p>
                <p className="font-display text-xl font-semibold">{item.content}</p>
              </div>
              <button
                onClick={handleListen}
                className="text-paper-faint hover:text-coral transition shrink-0 mt-1"
                aria-label="Listen"
              >
                <Volume2 size={20} />
              </button>
            </div>
            <p className="text-xs text-paper-muted mt-2 italic">{item.prompt}</p>
          </div>

          {/* Quality badge */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              quality === "good"
                ? "bg-mint/10 text-mint"
                : "bg-coral/10 text-coral"
            }`}
          >
            {quality === "good" ? (
              <><CheckCircle2 size={16} /> Got it — comes back in {calcPreview("good", item)} days</>
            ) : (
              <><XCircle size={16} /> Needs more practice — review again tomorrow</>
            )}
          </div>

          <button
            onClick={handleNext}
            className="btn-mint w-full py-3 text-base"
          >
            {idx + 1 < total ? "Next →" : "Finish session ✓"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Preview next interval for display only — doesn't mutate state. */
function calcPreview(quality: ReviewQuality, item: ReviewItem): number {
  if (quality === "again") return 1;
  const newReps = item.reps + 1;
  if (newReps === 1) return 1;
  if (newReps === 2) return 3;
  return Math.round(item.interval_days * item.ease);
}
