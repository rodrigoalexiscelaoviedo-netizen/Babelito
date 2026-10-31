import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Loader2, Play, Square, Target, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { speak, stopSpeech } from "../lib/speech";
import { addToReview } from "../lib/srs";
import ShadowingBlock from "../components/ShadowingBlock";
import { SITUATION_ICONS } from "../components/situationIcons";
import {
  QUIZ_PASS_PERCENT,
  SITUATION_XP,
  buildQuiz,
  getSituation,
  loadProgress,
  nextStep,
  quizPercent,
  saveStep,
  stepDone,
  stepsCount,
  toScenario,
  type Situation,
  type SituationSteps,
  type StepKey,
} from "../lib/situations";

const STEP_LABELS: Record<StepKey, string> = {
  phrases: "Learn",
  dialogue: "Listen",
  quiz: "Quiz",
  roleplay: "Speak",
};

function useSpeakPhrase() {
  const prefs = useVoicePrefs();
  return useCallback(
    (text: string, onEnd?: () => void, alt = false) =>
      speak(text, {
        voiceName: prefs.voiceName ?? undefined,
        rate: prefs.voiceRate,
        lang: prefs.voiceAccent || "en-GB",
        alt,
        onEnd,
      }),
    [prefs.voiceName, prefs.voiceRate, prefs.voiceAccent]
  );
}

export default function SituationDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const pack = getSituation(id);

  const [steps, setSteps] = useState<SituationSteps>({});
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<StepKey>("phrases");
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!profile || !pack) return;
    let cancelled = false;
    void loadProgress(profile.id).then((all) => {
      if (cancelled) return;
      const mine = all[pack.id]?.steps ?? {};
      setSteps(mine);
      setTab(nextStep(mine) ?? "phrases");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, pack]);

  // Cortar el audio al salir de la pantalla.
  useEffect(() => () => stopSpeech(), []);

  const record = useCallback(
    async (patch: Partial<SituationSteps>) => {
      if (!profile || !pack) return;
      // Optimista: se ve al instante; la base confirma después.
      setSteps((prev) => ({ ...prev, ...patch, quiz: Math.max(prev.quiz ?? 0, patch.quiz ?? 0) || undefined }));
      const res = await saveStep(profile.id, pack.id, patch);
      if (res) {
        setSteps(res.steps);
        if (res.justCompleted) setJustCompleted(true);
      }
    },
    [profile, pack]
  );

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;
  if (!pack) return <Navigate to="/situations" replace />;

  const Icon = SITUATION_ICONS[pack.icon] ?? Target;
  const done = stepsCount(steps);

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <Link to="/situations" className="mb-4 inline-flex items-center gap-1.5 text-xs text-paper-muted hover:text-paper transition">
        <ArrowLeft size={14} /> All situations
      </Link>

      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-coral/15 text-coral">
          <Icon size={24} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Situation · {pack.level}</p>
          <h1 className="page-title">{pack.title}</h1>
          <p className="text-sm text-paper-muted">{pack.blurb}</p>
        </div>
      </div>

      {justCompleted && (
        <div className="card mb-5 border-mint/40 p-4 text-center">
          <p className="font-display text-lg font-bold text-mint">Mission complete! 🎉</p>
          <p className="text-sm text-paper-muted">+{SITUATION_XP} XP. You can repeat any step whenever you like.</p>
        </div>
      )}

      {/* Pasos */}
      <div className="mb-5 grid grid-cols-4 gap-2" role="tablist" aria-label="Steps">
        {(Object.keys(STEP_LABELS) as StepKey[]).map((k, i) => {
          const ok = stepDone(steps, k);
          return (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-xl border px-2 py-2 text-center transition ${
                tab === k ? "border-coral bg-ink-700" : "border-ink-600 bg-ink-800 hover:bg-ink-700"
              }`}
            >
              <span className={`mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${ok ? "bg-mint text-ink-900" : "bg-ink-600 text-paper-muted"}`}>
                {ok ? <Check size={12} /> : i + 1}
              </span>
              <span className="text-xs font-medium">{STEP_LABELS[k]}</span>
            </button>
          );
        })}
      </div>
      <p className="mb-4 text-[11px] text-paper-faint">{done}/4 steps done</p>

      {!loaded ? (
        <div className="flex justify-center py-10 text-paper-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : tab === "phrases" ? (
        <LearnStep pack={pack} done={stepDone(steps, "phrases")} onDone={() => record({ phrases: true })} />
      ) : tab === "dialogue" ? (
        <DialogueStep pack={pack} done={stepDone(steps, "dialogue")} onDone={() => record({ dialogue: true })} />
      ) : tab === "quiz" ? (
        <QuizStep pack={pack} best={steps.quiz} onScore={(pct) => record({ quiz: pct })} />
      ) : (
        <SpeakStep pack={pack} done={stepDone(steps, "roleplay")} />
      )}
    </div>
  );
}

// ── Paso 1: frases y vocabulario ─────────────────────────────────────────────────

function LearnStep({ pack, done, onDone }: { pack: Situation; done: boolean; onDone: () => void }) {
  const { profile } = useAuth();
  const say = useSpeakPhrase();
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ added: number; total: number } | null>(null);

  async function saveAll() {
    if (!profile) return;
    setSaving(true);
    const lang = profile.learning_language || "en";
    const jobs = [
      ...pack.phrases.map((p) => addToReview(profile.id, { item_type: "chunk", content: p.en, prompt: p.es, source_ref: `situation:${pack.id}` }, lang)),
      ...pack.words.map((w) => addToReview(profile.id, { item_type: "word", content: w.en, prompt: w.es, source_ref: `situation:${pack.id}` }, lang)),
    ];
    const results = await Promise.all(jobs);
    setSaving(false);
    setSaved({ added: results.filter((r) => r === "added").length, total: results.length });
    if (results.some((r) => r !== "error")) onDone();
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Key phrases</h2>
        <p className="mb-3 text-xs text-paper-muted">Tap the speaker to listen. Open “Say it” to practise out loud and get feedback.</p>
        <ul className="space-y-2">
          {pack.phrases.map((p, i) => (
            <li key={p.en} className="card p-3">
              <div className="flex items-start gap-3">
                <button onClick={() => say(p.en)} className="mt-0.5 text-paper-faint hover:text-coral transition" aria-label={`Listen: ${p.en}`}>
                  <Volume2 size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.en}</p>
                  <p className="text-xs text-paper-muted">{p.es}</p>
                </div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex shrink-0 items-center gap-1 text-xs text-paper-muted hover:text-paper transition"
                  aria-expanded={open === i}
                >
                  Say it {open === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
              {open === i && (
                <div className="mt-3">
                  <ShadowingBlock text={p.en} label="Listen & repeat" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Useful words</h2>
        <div className="flex flex-wrap gap-2">
          {pack.words.map((w) => (
            <button
              key={w.en}
              onClick={() => say(w.en)}
              className="flex items-center gap-1.5 rounded-full bg-ink-700 px-3 py-1.5 text-sm transition hover:bg-ink-600"
              aria-label={`Listen: ${w.en}`}
            >
              <Volume2 size={12} className="text-paper-faint" />
              <span className="font-medium">{w.en}</span>
              <span className="text-xs text-paper-muted">· {w.es}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <p className="mb-1 font-medium">Make it stick</p>
        <p className="mb-3 text-xs text-paper-muted">
          Add these {pack.phrases.length} phrases and {pack.words.length} words to your daily review. You'll see them again at the right time.
        </p>
        <button className="btn-coral w-full" onClick={saveAll} disabled={saving}>
          {saving ? "Saving…" : done ? "Add again / refresh" : "Add to my review"}
        </button>
        {saved && (
          <p className="mt-2 text-center text-xs text-mint">
            ✓ {saved.added} new item{saved.added === 1 ? "" : "s"} added{saved.added < saved.total ? ` (${saved.total - saved.added} were already there)` : ""}.
          </p>
        )}
      </section>
    </div>
  );
}

// ── Paso 2: diálogo modelo ───────────────────────────────────────────────────────

function DialogueStep({ pack, done, onDone }: { pack: Situation; done: boolean; onDone: () => void }) {
  const say = useSpeakPhrase();
  const [playing, setPlaying] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const activeRef = useRef(false);
  const lines = pack.dialogue.lines;

  function playFrom(i: number) {
    if (!activeRef.current || i >= lines.length) {
      activeRef.current = false;
      setPlaying(null);
      return;
    }
    setPlaying(i);
    say(lines[i].en, () => playFrom(i + 1), lines[i].who === "other");
  }

  function toggleAll() {
    if (activeRef.current) {
      activeRef.current = false;
      stopSpeech();
      setPlaying(null);
      return;
    }
    activeRef.current = true;
    playFrom(0);
  }

  useEffect(
    () => () => {
      activeRef.current = false;
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Model dialogue</h2>
          <p className="text-xs text-paper-muted">
            You are <strong>You</strong>; the other person is the {pack.dialogue.otherRole.toLowerCase()}.
          </p>
        </div>
        <button onClick={toggleAll} className="btn-ghost flex shrink-0 items-center gap-1.5 text-sm">
          {playing !== null ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play all</>}
        </button>
      </div>

      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className={`flex ${l.who === "you" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-xl2 px-4 py-2.5 transition ${
                l.who === "you" ? "bg-coral/90 text-ink-900" : "card"
              } ${playing === i ? "ring-2 ring-mint" : ""}`}
            >
              <p className={`mb-0.5 font-mono text-[10px] uppercase tracking-widest ${l.who === "you" ? "text-ink-900/70" : "text-paper-faint"}`}>
                {l.who === "you" ? "You" : pack.dialogue.otherRole}
              </p>
              <div className="flex items-start gap-2">
                <p className="flex-1">{l.en}</p>
                <button onClick={() => say(l.en, undefined, l.who === "other")} className="mt-0.5 opacity-70 hover:opacity-100" aria-label={`Listen: ${l.en}`}>
                  <Volume2 size={14} />
                </button>
              </div>
              {l.who === "you" && (
                <button onClick={() => setOpen(open === i ? null : i)} className="mt-1 text-[11px] font-medium underline opacity-80 hover:opacity-100">
                  {open === i ? "Hide practice" : "Practise this line"}
                </button>
              )}
              {open === i && l.who === "you" && (
                <div className="mt-2 text-paper">
                  <ShadowingBlock text={l.en} label="Your line" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button className="btn-coral w-full" onClick={onDone}>
        {done ? "✓ Studied — mark again" : "I've studied this dialogue"}
      </button>
    </div>
  );
}

// ── Paso 3: quiz ─────────────────────────────────────────────────────────────────

function QuizStep({ pack, best, onScore }: { pack: Situation; best: number | undefined; onScore: (pct: number) => void }) {
  const [round, setRound] = useState(0);
  const quiz = useMemo(() => buildQuiz(pack.quiz), [pack, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const item = quiz[i];

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === item.correctIndex) setCorrect((c) => c + 1);
  }

  function next() {
    if (i + 1 < quiz.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    setFinished(true);
    onScore(quizPercent(correct, quiz.length));
  }

  function retry() {
    setRound((r) => r + 1);
    setI(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  }

  if (finished) {
    const pct = quizPercent(correct, quiz.length);
    const pass = pct >= QUIZ_PASS_PERCENT;
    return (
      <div className="card p-6 text-center">
        <p className={`font-display text-5xl font-extrabold ${pass ? "text-mint" : "text-gold"}`}>{pct}%</p>
        <p className="mt-1 text-paper-muted">
          {correct} of {quiz.length} correct
        </p>
        <p className="mt-3 text-sm">
          {pass ? "Nice! This step is done. Now try it for real in the roleplay." : `You need ${QUIZ_PASS_PERCENT}% to pass. Review the phrases and try again.`}
        </p>
        <button className="btn-coral mt-5 w-full" onClick={retry}>
          {pass ? "Play again" : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-paper-muted">
        <span>
          Question {i + 1} of {quiz.length}
        </span>
        {best !== undefined && <span>Best: {best}%</span>}
      </div>
      <p className="font-display text-lg font-semibold leading-snug">{item.q}</p>
      <ul className="space-y-2">
        {item.options.map((o, idx) => {
          const isRight = idx === item.correctIndex;
          const state =
            picked === null
              ? "border-ink-600 bg-ink-800 hover:bg-ink-700"
              : isRight
              ? "border-mint bg-mint/10"
              : idx === picked
              ? "border-coral bg-coral/10"
              : "border-ink-600 bg-ink-800 opacity-60";
          return (
            <li key={o}>
              <button onClick={() => choose(idx)} disabled={picked !== null} className={`w-full rounded-xl border p-3 text-left transition ${state}`}>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm ${picked === item.correctIndex ? "text-mint" : "text-coral"}`}>
            {picked === item.correctIndex ? "Correct!" : "Not quite — the green one is the natural way to say it."}
          </p>
          <button className="btn-coral px-4 py-2 text-sm" onClick={next}>
            {i + 1 < quiz.length ? "Next" : "See result"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Paso 4: roleplay ─────────────────────────────────────────────────────────────

function SpeakStep({ pack, done }: { pack: Situation; done: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-display text-lg font-bold">Live roleplay</h2>
      <p className="text-sm text-paper-muted">{pack.roleplay.description}</p>
      <p className="text-xs text-paper-faint">
        Your coach plays: {pack.roleplay.coachRole} The coach adapts to your level and gives feedback. Finish the session with at least a few exchanges so it counts.
      </p>
      {done && <p className="text-sm text-mint">✓ You've completed this step. You can do it again to keep practising.</p>}
      <button
        className="btn-coral w-full"
        onClick={() => navigate("/roleplay", { state: { scenario: toScenario(pack), packId: pack.id } })}
      >
        {done ? "Practise again" : "Start roleplay →"}
      </button>
    </div>
  );
}
