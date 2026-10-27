import { useHistoryBack } from "../lib/useHistoryBack";
import { useEffect, useState } from "react";
import { ArrowLeft, Volume2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { SOUNDS, type SoundEntry } from "../lib/soundsData";
import { catalanSounds, type CatalanSound } from "../lib/catalanSounds";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ShadowingBlock from "../components/ShadowingBlock";

// The Sounds UI (minimal pairs game, shadowing) was built around SoundEntry.
// catalanSounds.ts has a different shape (no minimal pairs / shadowing phrase
// data yet) — this adapts what exists rather than inventing pair/quiz data.
type SoundLike = SoundEntry & { lang?: string };

function catalanToSoundEntry(cs: CatalanSound): SoundLike {
  return {
    id: cs.id,
    ipa: cs.sound_ipa,
    name: cs.name,
    nameEs: cs.description,
    articulation: cs.articulation,
    examples: cs.words,
    minimalPairs: [], // no minimal-pair data for Catalan sounds yet
    shadowingPhrase: cs.examples[0]?.text ?? cs.words[0] ?? "",
    lang: "ca-ES",
  };
}

const CATALAN_SOUNDS: SoundLike[] = catalanSounds.map(catalanToSoundEntry);

// ─── List view ───────────────────────────────────────────────────────────────

/** Etiquetas de interfaz según el idioma que se aprende (las instrucciones de pronunciación siguen en español). */
function useUi() {
  const { profile } = useAuth();
  const ca = profile?.learning_language === "ca";
  return (en: string, cat: string) => (ca ? cat : en);
}

export default function Sounds() {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const isCatalan = (profile?.learning_language || "en") === "ca";
  const allSounds = isCatalan ? CATALAN_SOUNDS : SOUNDS;
  const [selected, setSelected] = useState<SoundLike | null>(null);
  useHistoryBack(selected !== null, () => setSelected(null));
  const [needsPractice, setNeedsPractice] = useState<Set<string>>(new Set());
  const [sorted, setSorted] = useState<SoundLike[]>(allSounds);

  useEffect(() => {
    setSorted(allSounds);
    setNeedsPractice(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCatalan]);

  useEffect(() => {
    if (!profile || isCatalan) return; // no pronunciation-error log for Catalan yet
    (async () => {
      const { data } = await supabase
        .from("errors")
        .select("original_text")
        .eq("user_id", profile.id)
        .eq("error_type", "pronunciation_error");

      if (!data || data.length === 0) return;

      const errorWords = new Set(
        data
          .map((r: { original_text: string | null }) => r.original_text ?? "")
          .filter(Boolean)
          .map((w) => w.toLowerCase())
      );

      // Score each sound by how many of its words appear in error log
      const scores: Record<string, number> = {};
      for (const sound of SOUNDS) {
        const candidates = [
          ...sound.examples,
          ...sound.minimalPairs.flatMap((p) => [p.a, p.b]),
        ].map((w) => w.toLowerCase());
        scores[sound.id] = candidates.filter((w) => errorWords.has(w)).length;
      }

      const struggling = new Set(
        Object.entries(scores)
          .filter(([, score]) => score > 0)
          .map(([id]) => id)
      );
      setNeedsPractice(struggling);

      const order = [...SOUNDS].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
      setSorted(order);
    })();
  }, [profile, isCatalan]);

  if (selected) {
    return (
      <SoundDetail
        sound={selected}
        voicePrefs={voicePrefs}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Speaking</p>
      <h1 className="page-title mb-1">Sounds</h1>
      <p className="text-paper-muted mb-8">
        {isCatalan
          ? "Els sons del català que costen més als castellanoparlants. Toca'n un per practicar."
          : "The English sounds Spanish speakers find hardest. Tap one to practise."}
      </p>

      <div className="grid lg:grid-cols-2 gap-3">
        {sorted.map((s) => (
          <SoundCard
            key={s.id}
            sound={s}
            needsPractice={needsPractice.has(s.id)}
            voicePrefs={voicePrefs}
            onSelect={() => setSelected(s)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sound card (list) ────────────────────────────────────────────────────────

function SoundCard({
  sound,
  needsPractice,
  voicePrefs,
  onSelect,
}: {
  sound: SoundLike;
  needsPractice: boolean;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  onSelect: () => void;
}) {
  function playFirst(e: React.MouseEvent) {
    e.stopPropagation();
    speak(sound.examples[0], {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate ?? 0.85,
      lang: sound.lang ?? voicePrefs.voiceAccent ?? "en-GB",
    });
  }

  return (
    <button
      onClick={onSelect}
      className="card-interactive p-5 text-left flex items-start gap-4"
    >
      {/* IPA badge */}
      <div className="shrink-0 w-16 h-16 rounded-xl bg-ink-600 flex items-center justify-center">
        <span className="font-display font-extrabold text-2xl text-coral">{sound.ipa}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-display font-bold text-base leading-snug">{sound.name}</p>
          {needsPractice && (
            <span className="shrink-0 text-[10px] font-mono bg-coral/20 text-coral px-2 py-0.5 rounded-full">
              Practise
            </span>
          )}
        </div>
        <p className="text-xs text-paper-muted leading-snug mb-2">{sound.nameEs}</p>
        <button
          onClick={playFirst}
          className="inline-flex items-center gap-1 text-xs text-paper-faint hover:text-coral transition"
        >
          <Volume2 size={13} /> {sound.examples[0]}
        </button>
      </div>
    </button>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function SoundDetail({
  sound,
  voicePrefs,
  onBack,
}: {
  sound: SoundLike;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
  onBack: () => void;
}) {
  const ui = useUi();
  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-paper transition mb-6"
      >
        <ArrowLeft size={16} /> All sounds
      </button>

      {/* Hero */}
      <div className="card p-6 mb-4 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-ink-600 flex items-center justify-center shrink-0">
          <span className="font-display font-extrabold text-4xl text-coral">{sound.ipa}</span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold">{sound.name}</h1>
          <p className="text-paper-muted text-sm mt-0.5">{sound.nameEs}</p>
        </div>
      </div>

      {/* Articulación */}
      <div className="card p-5 mb-4">
        <p className="eyebrow mb-2">{ui("How to make it", "Com es pronuncia")}</p>
        <p className="text-paper leading-relaxed">{sound.articulation}</p>
      </div>

      {/* Ejemplos con audio */}
      <ExamplesSection sound={sound} voicePrefs={voicePrefs} />

      {/* Minimal pairs — only when the sound has pair data */}
      {sound.minimalPairs.length > 0 && (
        <MinimalPairsSection sound={sound} voicePrefs={voicePrefs} />
      )}

      {/* Shadowing */}
      <div className="mb-6">
        <p className="eyebrow mb-3">{ui("Repeat", "Repeteix")}</p>
        <ShadowingBlock
          text={sound.shadowingPhrase}
          lang={sound.lang ?? voicePrefs.voiceAccent ?? "en-GB"}
          label={`Shadowing: ${sound.ipa}`}
        />
      </div>
    </div>
  );
}

// ─── Examples section ─────────────────────────────────────────────────────────

function ExamplesSection({
  sound,
  voicePrefs,
}: {
  sound: SoundLike;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
}) {
  const ui = useUi();
  function playWord(word: string) {
    speak(word, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate ?? 0.85,
      lang: sound.lang ?? voicePrefs.voiceAccent ?? "en-GB",
    });
  }

  return (
    <div className="card p-5 mb-4">
      <p className="eyebrow mb-3">{ui("Listen", "Escolta")}</p>
      <div className="flex flex-wrap gap-3">
        {sound.examples.map((word) => (
          <button
            key={word}
            onClick={() => playWord(word)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 transition group"
          >
            <Volume2 size={14} className="text-coral group-hover:text-coral" />
            <span className="font-display font-semibold">{word}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Minimal pairs section ────────────────────────────────────────────────────

type PairResult = "correct" | "wrong" | null;

interface PairState {
  playing: "a" | "b" | null;
  guess: "a" | "b" | null;
  result: PairResult;
  correct: number;
  total: number;
}

function MinimalPairsSection({
  sound,
  voicePrefs,
}: {
  sound: SoundEntry;
  voicePrefs: ReturnType<typeof useVoicePrefs>;
}) {
  const ui = useUi();
  const init = (): PairState => ({
    playing: null,
    guess: null,
    result: null,
    correct: 0,
    total: 0,
  });

  const [states, setStates] = useState<PairState[]>(() =>
    sound.minimalPairs.map(init)
  );
  const [played, setPlayed] = useState<("a" | "b")[]>(() =>
    sound.minimalPairs.map(() => (Math.random() < 0.5 ? "a" : "b"))
  );

  function handlePlay(pairIdx: number) {
    const side = played[pairIdx];
    const pair = sound.minimalPairs[pairIdx];
    const word = side === "a" ? pair.a : pair.b;
    speak(word, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate ?? 0.85,
      lang: voicePrefs.voiceAccent ?? "en-GB",
    });
    setStates((prev) =>
      prev.map((s, i) =>
        i === pairIdx ? { ...s, playing: side, guess: null, result: null } : s
      )
    );
  }

  function handleGuess(pairIdx: number, guess: "a" | "b") {
    const correctSide = played[pairIdx];
    const isRight = guess === correctSide;
    setStates((prev) =>
      prev.map((s, i) =>
        i === pairIdx
          ? {
              ...s,
              guess,
              result: isRight ? "correct" : "wrong",
              correct: s.correct + (isRight ? 1 : 0),
              total: s.total + 1,
            }
          : s
      )
    );
  }

  function handleNext(pairIdx: number) {
    // Pick a new random side for the next round
    setPlayed((prev) => {
      const next = [...prev];
      next[pairIdx] = Math.random() < 0.5 ? "a" : "b";
      return next;
    });
    setStates((prev) =>
      prev.map((s, i) =>
        i === pairIdx ? { ...s, playing: null, guess: null, result: null } : s
      )
    );
  }

  const totalCorrect = states.reduce((acc, s) => acc + s.correct, 0);
  const totalPlayed = states.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">{ui("Train your ear", "Entrena l'oïda")}</p>
        {totalPlayed > 0 && (
          <span className="text-xs font-mono text-paper-muted">
            {totalCorrect}/{totalPlayed} {ui("correct", "correctes")}
          </span>
        )}
      </div>
      <p className="text-xs text-paper-muted mb-4">
        {ui("Listen to the word and tap the one you heard.", "Escolta la paraula i toca la que has sentit.")}
      </p>

      <div className="space-y-4">
        {sound.minimalPairs.map((pair, i) => {
          const s = states[i];
          const hasPlayed = s.playing !== null;
          const hasResult = s.result !== null;

          return (
            <div key={i} className="border border-ink-600 rounded-xl p-4 space-y-3">
              {/* Pair labels */}
              <div className="flex items-center justify-between text-xs text-paper-faint">
                <span className="font-mono">{pair.soundA}</span>
                <span className="font-mono">{pair.soundB}</span>
              </div>

              {/* Play button */}
              <button
                onClick={() => handlePlay(i)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ink-600 hover:bg-ink-500 transition text-sm font-medium"
              >
                <Volume2 size={15} className="text-coral" />
                {hasPlayed ? ui("Listen again", "Torna a escoltar") : ui("Listen", "Escolta")}
              </button>

              {/* Guess buttons — only after playing */}
              {hasPlayed && (
                <div className="grid grid-cols-2 gap-2">
                  {(["a", "b"] as const).map((side) => {
                    const word = side === "a" ? pair.a : pair.b;
                    const correctSide = played[i];
                    const isGuessed = s.guess === side;
                    const isCorrectSide = side === correctSide;

                    let cls =
                      "py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 ";
                    if (!hasResult) {
                      cls += "bg-ink-600 hover:bg-ink-500 text-paper";
                    } else if (isCorrectSide) {
                      cls += "bg-mint/20 border border-mint text-mint";
                    } else if (isGuessed && !isCorrectSide) {
                      cls += "bg-coral/20 border border-coral text-coral";
                    } else {
                      cls += "bg-ink-600 text-paper-muted";
                    }

                    return (
                      <button
                        key={side}
                        onClick={() => !hasResult && handleGuess(i, side)}
                        disabled={hasResult}
                        className={cls}
                      >
                        {hasResult && isCorrectSide && <CheckCircle2 size={13} />}
                        {hasResult && isGuessed && !isCorrectSide && <XCircle size={13} />}
                        {word}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Feedback + next */}
              {hasResult && (
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      s.result === "correct" ? "text-mint" : "text-coral"
                    }`}
                  >
                    {s.result === "correct" ? ui("Correct!", "Correcte!") : `${ui("It was", "Era")} "${played[i] === "a" ? pair.a : pair.b}"`}
                  </span>
                  <button
                    onClick={() => handleNext(i)}
                    className="text-xs text-paper-faint hover:text-paper transition"
                  >
                    {ui("Next", "Següent")} →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
