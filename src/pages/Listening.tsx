import { useHistoryBack } from "../lib/useHistoryBack";
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Volume2, RotateCcw, ArrowLeft, Headphones, Keyboard } from "lucide-react";
import {
  PATTERNS,
  ALL_TYPES,
  TYPE_LABELS,
  TYPE_DESCRIPTIONS,
  type LinkingPattern,
  type LinkingType,
} from "../lib/linkingData";
import { catalanListeningPatterns, type ListeningPattern } from "../lib/catalanListeningPatterns";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { useAuth } from "../context/AuthContext";
import { awardXp, listeningXp } from "../lib/xp";
import { recordSkillAttempt } from "../lib/skillLevels";
import ShadowingBlock from "../components/ShadowingBlock";
import { tFor } from "../i18n";

type T = ReturnType<typeof tFor>;

// Rate for native-speed playback
const NATIVE_RATE = 1.2;

// The train-my-ear quiz needs a consistent { written, spoken, distractors }
// shape. catalanListeningPatterns.ts has inconsistent per-entry exercise
// fields (slow/fast, wrong/correct, stressed/fast, ...), so this pulls out the
// "reduced" form where the key is recognisable and falls back to the written
// form otherwise, and builds distractors from other patterns' examples.
type LinkingLike = LinkingPattern & { lang?: string };

// Only "fast"/"correct" reliably hold a full spoken phrase in this data set —
// other keys (e.g. "nasal", "c_soft") hold bare phonemes/contrast words, not
// something worth reading aloud or showing as the "spoken" form.
const FAST_FORM_KEYS = ["fast", "correct"];

function firstFastForm(pairs: Array<Record<string, unknown>>): string | null {
  for (const pair of pairs) {
    for (const key of FAST_FORM_KEYS) {
      const val = pair[key];
      if (typeof val === "string" && val.trim()) return val;
    }
  }
  return null;
}

function catalanPatternType(pattern: string): LinkingType {
  const p = pattern.toLowerCase();
  if (p.includes("linking") || p.includes("fusion")) return "linking";
  if (p.includes("reduction")) return "reduction";
  if (p.includes("elision") || p.includes("silent") || p.includes("deletion")) return "elision";
  return "assimilation";
}

function catalanToLinkingPattern(lp: ListeningPattern, all: ListeningPattern[]): LinkingLike {
  const spoken = firstFastForm(lp.exercise_word_pairs) ?? lp.catalan_example;
  const distractors = all
    .filter((other) => other.id !== lp.id)
    .map((other) => other.catalan_example)
    .filter((ex) => ex !== lp.catalan_example)
    .slice(0, 2);
  return {
    id: lp.id,
    type: catalanPatternType(lp.pattern),
    written: lp.catalan_example,
    spoken,
    explanationEs: lp.explanation,
    distractors,
    lang: "ca-ES",
  };
}

const CATALAN_PATTERNS: LinkingLike[] = catalanListeningPatterns.map((lp) =>
  catalanToLinkingPattern(lp, catalanListeningPatterns)
);

// ─── Main page ────────────────────────────────────────────────────────────────

type View = "list" | "detail" | "train";

export default function Listening() {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const learningLanguage = profile?.learning_language || "en";
  const isCatalan = learningLanguage === "ca";
  const t = tFor(learningLanguage);
  const patterns = isCatalan ? CATALAN_PATTERNS : PATTERNS;
  const [view, setView] = useState<View>("list");
  const [detail, setDetail] = useState<LinkingLike | null>(null);
  const [trainKey, setTrainKey] = useState(0);
  useHistoryBack(view !== "list", () => setView("list"));

  function playSpoken(pattern: LinkingLike, e?: React.MouseEvent) {
    e?.stopPropagation();
    speak(pattern.spoken, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: NATIVE_RATE,
      lang: pattern.lang ?? voicePrefs.voiceAccent ?? (isCatalan ? "ca-ES" : "en-GB"),
    });
  }

  if (view === "detail" && detail) {
    return (
      <DetailView
        pattern={detail}
        t={t}
        isCatalan={isCatalan}
        voicePrefs={voicePrefs}
        playSpoken={playSpoken}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "train") {
    return (
      <TrainView
        key={trainKey}
        onRestart={() => setTrainKey((k) => k + 1)}
        patterns={patterns}
        t={t}
        isCatalan={isCatalan}
        voicePrefs={voicePrefs}
        playSpoken={playSpoken}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <ListView
      patterns={patterns}
      t={t}
      isCatalan={isCatalan}
      playSpoken={playSpoken}
      onSelect={(p) => {
        setDetail(p);
        setView("detail");
      }}
      onTrain={() => setView("train")}
    />
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({
  patterns,
  t,
  isCatalan,
  playSpoken,
  onSelect,
  onTrain,
}: {
  patterns: LinkingLike[];
  t: T;
  isCatalan: boolean;
  playSpoken: (p: LinkingLike, e?: React.MouseEvent) => void;
  onSelect: (p: LinkingLike) => void;
  onTrain: () => void;
}) {
  const [activeType, setActiveType] = useState<LinkingType | "all">("all");

  const filtered =
    activeType === "all" ? patterns : patterns.filter((p) => p.type === activeType);

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <p className="eyebrow mb-2">{t("listening.eyebrow")}</p>
        <h1 className="page-title">{t("listening.title")}</h1>
        <p className="text-paper-muted mt-1">{t("listening.intro")}</p>
      </header>

      {!isCatalan && (
        <div className="card mb-8 border-coral/30 bg-gradient-to-br from-ink-700 to-ink-800 p-5">
          <ol className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
            {[
              ["1", t("listening.step1Title"), t("listening.step1Desc")],
              ["2", t("listening.step2Title"), t("listening.step2Desc")],
              ["3", t("listening.step3Title"), t("listening.step3Desc")],
            ].map(([n, title, d]) => (
              <li key={n} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-coral/15 font-mono text-xs font-bold text-coral">{n}</span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-xs text-paper-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <button className="btn-coral flex w-full items-center justify-center gap-2" onClick={onTrain}>
            <Headphones size={16} /> {t("listening.trainBtn")}
          </button>
          <p className="mt-2 text-center text-xs text-paper-faint">{t("listening.browseHint")}</p>
        </div>
      )}
      {isCatalan && (
        <button className="btn-coral mb-6 flex items-center gap-2" onClick={onTrain}>
          <Headphones size={16} /> {t("listening.trainBtn")}
        </button>
      )}

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TypeChip active={activeType === "all"} onClick={() => setActiveType("all")}>
          {t("listening.all")}
        </TypeChip>
        {ALL_TYPES.map((type) => (
          <TypeChip key={type} active={activeType === type} onClick={() => setActiveType(type)}>
            {TYPE_LABELS[type]}
          </TypeChip>
        ))}
      </div>

      {/* Pattern cards grouped by type */}
      {(activeType === "all" ? ALL_TYPES : [activeType]).map((type) => {
        const group = filtered.filter((p) => p.type === type);
        if (!group.length) return null;
        return (
          <section key={type} className="mb-8">
            <div className="mb-3">
              <h2 className="font-display font-bold text-lg">{TYPE_LABELS[type]}</h2>
              <p className="text-xs text-paper-muted">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {group.map((p) => (
                <PatternCard key={p.id} pattern={p} t={t} playSpoken={playSpoken} onSelect={onSelect} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active ? "bg-coral text-ink-900" : "bg-ink-600 text-paper-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

function PatternCard({
  pattern,
  t,
  playSpoken,
  onSelect,
}: {
  pattern: LinkingLike;
  t: T;
  playSpoken: (p: LinkingLike, e?: React.MouseEvent) => void;
  onSelect: (p: LinkingLike) => void;
}) {
  // La tarjeta y el botón de escuchar son hermanos (no un botón dentro de otro).
  return (
    <div className="card relative p-4 hover:border-coral/50 transition">
      <button onClick={() => onSelect(pattern)} className="block w-full pr-8 text-left">
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          {TYPE_LABELS[pattern.type]}
        </span>
        <span className="mb-1 block text-sm leading-snug text-paper-muted">{pattern.written}</span>
        <span className="block text-base font-semibold italic text-coral">{pattern.spoken}</span>
      </button>
      <button
        onClick={(e) => playSpoken(pattern, e)}
        className="absolute right-3 top-3 text-paper-faint transition hover:text-coral"
        aria-label={t("listening.listenNativeAria", { s: pattern.spoken })}
      >
        <Volume2 size={15} aria-hidden />
      </button>
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  pattern,
  t,
  isCatalan,
  voicePrefs,
  playSpoken,
  onBack,
}: {
  pattern: LinkingLike;
  t: T;
  isCatalan: boolean;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  playSpoken: (p: LinkingLike, e?: React.MouseEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper transition mb-6"
      >
        <ArrowLeft size={16} /> {t("listening.allPatterns")}
      </button>

      <h1 className="sr-only">{TYPE_LABELS[pattern.type]}</h1>
      {/* Hero */}
      <div className="card p-6 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint mb-3 block">
          {TYPE_LABELS[pattern.type]}
        </span>
        <div className="space-y-2 mb-4">
          <div>
            <p className="text-xs text-paper-muted mb-0.5">{t("listening.written")}</p>
            <p className="font-display text-xl font-semibold">{pattern.written}</p>
          </div>
          <div>
            <p className="text-xs text-paper-muted mb-0.5">{t("listening.spokenNative")}</p>
            <p className="font-display text-xl font-bold text-coral italic">{pattern.spoken}</p>
          </div>
        </div>
        <p className="text-sm text-paper leading-relaxed mb-4">{pattern.explanationEs}</p>
        <button
          onClick={(e) => playSpoken(pattern, e)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 transition text-sm font-medium"
        >
          <Volume2 size={15} className="text-coral" /> {t("listening.listenNative")}
        </button>
      </div>

      {/* Shadowing */}
      <div className="mb-4">
        <p className="eyebrow mb-3">{t("listening.repeatEyebrow")}</p>
        <ShadowingBlock
          text={pattern.written}
          lang={pattern.lang ?? voicePrefs.voiceAccent ?? (isCatalan ? "ca-ES" : "en-GB")}
          label={t("listening.listenRepeat")}
        />
      </div>
    </div>
  );
}

// ─── Train view ───────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(patterns: LinkingLike[]): LinkingLike[] {
  return shuffle(patterns);
}

type TrainPhase = "listening" | "answered";

export function TrainView({
  patterns,
  t,
  isCatalan,
  voicePrefs,
  playSpoken,
  onBack,
  onRestart,
}: {
  patterns: LinkingLike[];
  t: T;
  isCatalan: boolean;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  playSpoken: (p: LinkingLike, e?: React.MouseEvent) => void;
  onBack: () => void;
  onRestart?: () => void;
}) {
  const navigate = useNavigate();
  const [missed, setMissed] = useState<LinkingLike[]>([]);
  const [queue] = useState<LinkingLike[]>(() => buildQueue(patterns));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<TrainPhase>("listening");
  const [choices, setChoices] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const { profile } = useAuth();
  const sessionKey = useRef<string | null>(null);
  useEffect(() => {
    if (!done || !profile) return;
    void awardXp(profile.id, { source: "listening", refKey: (sessionKey.current ??= `listening:${Date.now()}`), amount: listeningXp(correct), meta: { correct } });
    // Nivel de escucha: aciertos de la ronda sobre el total de patrones.
    void recordSkillAttempt(profile.id, "listening", correct, queue.length);
  }, [done, profile, correct, queue]);

  const pattern = queue[idx];

  const buildChoices = useCallback(
    (p: LinkingLike) => {
      const opts = shuffle([p.written, ...p.distractors]);
      setChoices(opts);
    },
    []
  );

  // Initialize choices for first pattern on mount, then auto-play
  useEffect(() => {
    buildChoices(queue[0]);
    const tm = setTimeout(() => playSpoken(queue[0]), 400);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlayCurrent() {
    playSpoken(pattern);
  }

  function handleChoose(choice: string) {
    if (phase === "answered") return;
    setChosen(choice);
    if (choice === pattern.written) setCorrect((c) => c + 1);
    else setMissed((m) => [...m, pattern]);
    setPhase("answered");
  }

  function handleNext() {
    const nextIdx = idx + 1;
    if (nextIdx >= queue.length) {
      setDone(true);
      return;
    }
    const nextPattern = queue[nextIdx];
    setIdx(nextIdx);
    setPhase("listening");
    setChosen(null);
    buildChoices(nextPattern);
    // Auto-play next
    setTimeout(() => playSpoken(nextPattern), 300);
  }

  if (done) {
    return (
      <div className="animate-fade-up max-w-md mx-auto text-center pt-10">
        <Headphones size={44} className="mx-auto text-coral mb-3" />
        <h1 className="page-title mb-2">{t("listening.completeTitle")}</h1>
        <p className="font-display text-5xl font-extrabold text-mint mb-1">{correct}</p>
        <p className="text-paper-muted mb-2">{t("listening.outOf", { n: queue.length })}</p>
        <p className="text-sm text-paper-faint mb-6">
          {correct >= queue.length * 0.8 ? t("listening.excellent") : t("listening.keepPractising")}
        </p>

        {missed.length > 0 && !isCatalan && (
          <div className="card mb-6 p-4 text-left">
            <p className="eyebrow mb-2">{t("listening.toHearAgain")}</p>
            <ul className="space-y-2">
              {missed.map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <button onClick={(e) => playSpoken(p, e)} aria-label={t("listening.listenSpokenAria", { s: p.spoken })} className="text-coral">
                    <Volume2 size={16} />
                  </button>
                  <span className="flex-1">
                    <span className="text-paper-muted">{p.written}</span> <span className="text-paper-faint">→</span>{" "}
                    <span className="font-semibold italic text-coral">{p.spoken}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {onRestart && (
            <button className="btn-coral w-full" onClick={onRestart}>
              {t("listening.trainAgain")}
            </button>
          )}
          {!isCatalan && (
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-2.5 text-sm font-medium transition hover:bg-ink-500" onClick={() => navigate("/dictation")}>
              <Keyboard size={16} className="text-coral" /> {t("listening.nextDictation")}
            </button>
          )}
          <button className="py-2 text-sm text-paper-muted hover:text-paper" onClick={onBack}>
            {t("listening.backPatterns")}
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = chosen === pattern.written;

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <h1 className="sr-only">{t("listening.train")}</h1>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper transition"
        >
          <ArrowLeft size={16} /> {t("listening.exit")}
        </button>
        <span className="text-sm font-mono text-paper-muted">
          {t("listening.progressLine", { i: idx + 1, n: queue.length, c: correct })}
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-label={t("listening.progress")}
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={idx}
        className="h-1.5 w-full bg-ink-600 rounded-full mb-6 overflow-hidden"
      >
        <div
          className="h-full bg-coral rounded-full transition-all"
          style={{ width: `${(idx / queue.length) * 100}%` }}
        />
      </div>

      {/* Prompt card */}
      <div className="card p-6 mb-5">
        <p className="eyebrow mb-3">{t("listening.whatHeard")}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayCurrent}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-coral text-ink-900 font-medium hover:bg-coral/90 transition"
          >
            <Volume2 size={18} /> {t("listening.listen")}
          </button>
          <button
            onClick={handlePlayCurrent}
            className="text-paper-faint hover:text-paper transition"
            aria-label={t("listening.replay")}
          >
            <RotateCcw size={18} />
          </button>
          <span className="text-xs text-paper-faint italic">
            {TYPE_LABELS[pattern.type]}
          </span>
        </div>
      </div>

      {/* Choices */}
      <div className="space-y-2 mb-5">
        {choices.map((c) => {
          const isChosen = chosen === c;
          const isAnswer = c === pattern.written;

          let cls =
            "w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition border ";
          if (!chosen) {
            cls += "border-ink-600 bg-ink-700 hover:border-coral/50 hover:bg-ink-600 text-paper";
          } else if (isAnswer) {
            cls += "border-mint bg-mint/10 text-mint";
          } else if (isChosen && !isAnswer) {
            cls += "border-coral bg-coral/10 text-coral";
          } else {
            cls += "border-ink-600 bg-ink-700 text-paper-muted opacity-60";
          }

          return (
            <button key={c} className={cls} onClick={() => handleChoose(c)} disabled={!!chosen}>
              {c}
            </button>
          );
        })}
      </div>

      {/* Feedback + shadowing after answer */}
      {phase === "answered" && (
        <div className="animate-fade-up space-y-4">
          {/* Result banner */}
          <div role="status"
            className={`rounded-xl p-4 ${
              isCorrect ? "bg-mint/10 border border-mint/30" : "bg-coral/10 border border-coral/30"
            }`}
          >
            <p className={`font-medium mb-1 ${isCorrect ? "text-mint" : "text-coral"}`}>
              {isCorrect ? t("listening.correctBanner") : t("listening.notQuite")}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-xs text-paper-muted">{t("listening.writtenLabel")}</span>
              <span className="font-medium text-paper">{pattern.written}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-xs text-paper-muted">{t("listening.spokenLabel")}</span>
              <span className="font-semibold text-coral italic">{pattern.spoken}</span>
            </div>
            <p className="text-sm text-paper leading-relaxed mt-1">{pattern.explanationEs}</p>
          </div>

          {/* Replay at native speed */}
          <button
            onClick={handlePlayCurrent}
            className="flex items-center gap-2 text-sm text-paper-faint hover:text-coral transition"
          >
            <RotateCcw size={14} /> {t("listening.listenAgainNative")}
          </button>

          {/* Shadowing the written form */}
          <ShadowingBlock
            text={pattern.written}
            lang={voicePrefs.voiceAccent ?? (isCatalan ? "ca-ES" : "en-GB")}
            label={t("listening.nowRepeat")}
          />

          <button className="btn-mint w-full py-3" onClick={handleNext}>
            {idx + 1 < queue.length ? t("listening.next") : t("listening.finish")}
          </button>
        </div>
      )}
    </div>
  );
}
