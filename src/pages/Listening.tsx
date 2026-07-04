import { useState, useCallback, useEffect } from "react";
import { Volume2, RotateCcw, ArrowLeft, Headphones } from "lucide-react";
import {
  PATTERNS,
  ALL_TYPES,
  TYPE_LABELS,
  TYPE_DESCRIPTIONS,
  type LinkingPattern,
  type LinkingType,
} from "../lib/linkingData";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ShadowingBlock from "../components/ShadowingBlock";

// Rate for native-speed playback
const NATIVE_RATE = 1.2;

// ─── Main page ────────────────────────────────────────────────────────────────

type View = "list" | "detail" | "train";

export default function Listening() {
  const voicePrefs = useVoicePrefs();
  const [view, setView] = useState<View>("list");
  const [detail, setDetail] = useState<LinkingPattern | null>(null);

  function playSpoken(pattern: LinkingPattern, e?: React.MouseEvent) {
    e?.stopPropagation();
    speak(pattern.spoken, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: NATIVE_RATE,
      lang: voicePrefs.voiceAccent ?? "en-GB",
    });
  }

  if (view === "detail" && detail) {
    return (
      <DetailView
        pattern={detail}
        voicePrefs={voicePrefs}
        playSpoken={playSpoken}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "train") {
    return (
      <TrainView
        voicePrefs={voicePrefs}
        playSpoken={playSpoken}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <ListView
      voicePrefs={voicePrefs}
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
  playSpoken,
  onSelect,
  onTrain,
}: {
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  playSpoken: (p: LinkingPattern, e?: React.MouseEvent) => void;
  onSelect: (p: LinkingPattern) => void;
  onTrain: () => void;
}) {
  const [activeType, setActiveType] = useState<LinkingType | "all">("all");

  const filtered =
    activeType === "all" ? PATTERNS : PATTERNS.filter((p) => p.type === activeType);

  return (
    <div className="animate-fade-up">
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="eyebrow mb-2">Speaking</p>
          <h1 className="font-display text-3xl font-extrabold">Listening</h1>
          <p className="text-paper-muted mt-1">
            Entrenás tu oído para el habla conectada de los nativos.
          </p>
        </div>
        <button className="btn-coral shrink-0" onClick={onTrain}>
          <Headphones size={16} /> Train my ear
        </button>
      </header>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TypeChip active={activeType === "all"} onClick={() => setActiveType("all")}>
          All
        </TypeChip>
        {ALL_TYPES.map((t) => (
          <TypeChip key={t} active={activeType === t} onClick={() => setActiveType(t)}>
            {TYPE_LABELS[t]}
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
                <PatternCard key={p.id} pattern={p} playSpoken={playSpoken} onSelect={onSelect} />
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
  playSpoken,
  onSelect,
}: {
  pattern: LinkingPattern;
  playSpoken: (p: LinkingPattern, e?: React.MouseEvent) => void;
  onSelect: (p: LinkingPattern) => void;
}) {
  return (
    <button
      onClick={() => onSelect(pattern)}
      className="card p-4 text-left hover:border-coral/50 transition"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          {TYPE_LABELS[pattern.type]}
        </span>
        <button
          onClick={(e) => playSpoken(pattern, e)}
          className="text-paper-faint hover:text-coral transition shrink-0"
          aria-label="Listen at native speed"
        >
          <Volume2 size={15} />
        </button>
      </div>
      <p className="text-sm text-paper-muted leading-snug mb-1">{pattern.written}</p>
      <p className="text-base font-semibold text-coral italic">{pattern.spoken}</p>
    </button>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  pattern,
  voicePrefs,
  playSpoken,
  onBack,
}: {
  pattern: LinkingPattern;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  playSpoken: (p: LinkingPattern, e?: React.MouseEvent) => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper transition mb-6"
      >
        <ArrowLeft size={16} /> All patterns
      </button>

      {/* Hero */}
      <div className="card p-6 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint mb-3 block">
          {TYPE_LABELS[pattern.type]}
        </span>
        <div className="space-y-2 mb-4">
          <div>
            <p className="text-xs text-paper-muted mb-0.5">Written</p>
            <p className="font-display text-xl font-semibold">{pattern.written}</p>
          </div>
          <div>
            <p className="text-xs text-paper-muted mb-0.5">Spoken (native speed)</p>
            <p className="font-display text-xl font-bold text-coral italic">{pattern.spoken}</p>
          </div>
        </div>
        <p className="text-sm text-paper leading-relaxed mb-4">{pattern.explanationEs}</p>
        <button
          onClick={(e) => playSpoken(pattern, e)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 transition text-sm font-medium"
        >
          <Volume2 size={15} className="text-coral" /> Listen at native speed
        </button>
      </div>

      {/* Shadowing */}
      <div className="mb-4">
        <p className="eyebrow mb-3">Repetí</p>
        <ShadowingBlock
          text={pattern.written}
          lang={voicePrefs.voiceAccent ?? "en-GB"}
          label="Listen & repeat"
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

function buildQueue(): LinkingPattern[] {
  return shuffle(PATTERNS);
}

type TrainPhase = "listening" | "answered";

export function TrainView({
  voicePrefs,
  playSpoken,
  onBack,
}: {
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  playSpoken: (p: LinkingPattern, e?: React.MouseEvent) => void;
  onBack: () => void;
}) {
  const [queue] = useState<LinkingPattern[]>(buildQueue);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<TrainPhase>("listening");
  const [choices, setChoices] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const pattern = queue[idx];

  const buildChoices = useCallback(
    (p: LinkingPattern) => {
      const opts = shuffle([p.written, ...p.distractors]);
      setChoices(opts);
    },
    []
  );

  // Initialize choices for first pattern on mount, then auto-play
  useEffect(() => {
    buildChoices(queue[0]);
    const t = setTimeout(() => playSpoken(queue[0]), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePlayCurrent() {
    playSpoken(pattern);
  }

  function handleChoose(choice: string) {
    if (phase === "answered") return;
    setChosen(choice);
    if (choice === pattern.written) setCorrect((c) => c + 1);
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
      <div className="animate-fade-up max-w-md mx-auto text-center pt-16">
        <Headphones size={48} className="mx-auto text-coral mb-4" />
        <h1 className="font-display text-3xl font-extrabold mb-2">Session complete!</h1>
        <p className="font-display text-5xl font-extrabold text-mint mb-1">{correct}</p>
        <p className="text-paper-muted mb-2">out of {queue.length} correct</p>
        <p className="text-sm text-paper-faint mb-8">
          {correct >= queue.length * 0.8
            ? "Excellent ear! Keep it up."
            : "Keep practising — your ear is getting sharper."}
        </p>
        <button className="btn-coral w-full" onClick={onBack}>
          Back to patterns
        </button>
      </div>
    );
  }

  const isCorrect = chosen === pattern.written;

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper transition"
        >
          <ArrowLeft size={16} /> Exit
        </button>
        <span className="text-sm font-mono text-paper-muted">
          {idx + 1} / {queue.length} · {correct} correct
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-ink-600 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-all"
          style={{ width: `${(idx / queue.length) * 100}%` }}
        />
      </div>

      {/* Prompt card */}
      <div className="card p-6 mb-5">
        <p className="eyebrow mb-3">What did you hear?</p>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayCurrent}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-coral text-ink-900 font-medium hover:bg-coral/90 transition"
          >
            <Volume2 size={18} /> Listen
          </button>
          <button
            onClick={handlePlayCurrent}
            className="text-paper-faint hover:text-paper transition"
            aria-label="Replay"
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
          <div
            className={`rounded-xl p-4 ${
              isCorrect ? "bg-mint/10 border border-mint/30" : "bg-coral/10 border border-coral/30"
            }`}
          >
            <p className={`font-medium mb-1 ${isCorrect ? "text-mint" : "text-coral"}`}>
              {isCorrect ? "¡Correcto!" : "Incorrecto"}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-xs text-paper-muted">Written:</span>
              <span className="font-medium text-paper">{pattern.written}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <span className="text-xs text-paper-muted">Spoken:</span>
              <span className="font-semibold text-coral italic">{pattern.spoken}</span>
            </div>
            <p className="text-sm text-paper leading-relaxed mt-1">{pattern.explanationEs}</p>
          </div>

          {/* Replay at native speed */}
          <button
            onClick={handlePlayCurrent}
            className="flex items-center gap-2 text-sm text-paper-faint hover:text-coral transition"
          >
            <RotateCcw size={14} /> Listen again at native speed
          </button>

          {/* Shadowing the written form */}
          <ShadowingBlock
            text={pattern.written}
            lang={voicePrefs.voiceAccent ?? "en-GB"}
            label="Now repeat it"
          />

          <button className="btn-mint w-full py-3" onClick={handleNext}>
            {idx + 1 < queue.length ? "Next →" : "Finish session ✓"}
          </button>
        </div>
      )}
    </div>
  );
}
