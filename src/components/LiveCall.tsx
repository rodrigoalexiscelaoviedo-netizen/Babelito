import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Loader2, RotateCcw, Sparkles, Clock, Target } from "lucide-react";
import { LiveSession, LIVE_MAX_SECONDS, type LiveCorrection, type LiveSituation } from "../lib/liveSession";
import { liveReport, type LiveReport } from "../lib/geminiTools";
import { SITUATIONS, type Situation } from "../lib/situationsData";
import { SITUATIONS_CA } from "../lib/situationsDataCa";
import { awardXp } from "../lib/xp";
import CallReview, { EMPTY_REVIEW, type CallReviewState } from "./CallReview";
import LivePicker from "./live/LivePicker";
import LiveStage from "./live/LiveStage";
import type { TutorMode } from "./live/TutorStage";
import { forgetMemory, loadMemory, mergeMemory, mistakesFromCorrections, reviewCall, saveCall, saveInsights, toTurns, type CallReviewData } from "../lib/liveReview";
import { loadLivePrefs, saveLivePrefs, type LivePrefs } from "../lib/liveHelp";
import { goalsFor } from "../lib/liveGoals";
import { loadErrorRows, summarizeErrors } from "../lib/mistakes";
import { errorLabel } from "../lib/errorTypes";
import { tFor } from "../i18n";

/** Silencio, tras el turno del coach, a partir del cual se ofrece ayuda. */
const STUCK_AFTER_MS = 9000;
/** Sin voz propia ni del coach durante este tiempo: se muestra "Thinking". */
const THINKING_AFTER_MS = 1800;
/** Cuando queda este tiempo, el coach se despide. */
const WRAP_UP_SECONDS = 45;

type Choice = { kind: "free" } | { kind: "situation"; situation: Situation } | { kind: "surprise" };
type State = "pick" | "connecting" | "live" | "ended" | "error";
type T = ReturnType<typeof tFor>;

/**
 * Llamada en tiempo real con el coach (voz a voz, BETA).
 * Selector de modo (charla libre, situación o sorpresa), llamada con orbe animado,
 * tope de 15 minutos y resumen al colgar.
 */
type LiveCallProps = {
  userId: string;
  level: string;
  name: string;
  topic: string | null;
  onClose: () => void;
  /** Idioma que se aprende: "en" (por defecto) o "ca". */
  lang?: "en" | "ca";
};

/**
 * Se dibuja directo en <body>: así la pantalla completa no queda encerrada dentro
 * de la página (una animación de entrada en un ancestro la recortaría).
 */
export default function LiveCall(props: LiveCallProps) {
  return createPortal(<LiveCallView {...props} />, document.body);
}

function LiveCallView({
  userId,
  level,
  name,
  topic,
  onClose,
  lang = "en",
}: LiveCallProps) {
  const t = tFor(lang);
  const bank = lang === "ca" ? SITUATIONS_CA : SITUATIONS;
  const [choice, setChoice] = useState<Choice | null>(null);
  const [state, setState] = useState<State>("pick");
  const [detail, setDetail] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [said, setSaid] = useState("");
  const [seconds, setSeconds] = useState(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const startedAt = useRef<number | null>(null);
  const rewarded = useRef(false);
  const [xp, setXp] = useState(0);
  // Conversación completa (alumno y coach, en orden) para el informe final.
  const logRef = useRef<Array<{ who: "learner" | "coach"; text: string }>>([]);
  const correctionsRef = useRef<LiveCorrection[]>([]);
  const [corrections, setCorrections] = useState<LiveCorrection[]>([]);
  const [tip, setTip] = useState<LiveCorrection | null>(null);
  const [report, setReport] = useState<LiveReport | null>(null);
  const [reportState, setReportState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const reportRequested = useRef(false);
  const [review, setReview] = useState<CallReviewState>(EMPTY_REVIEW);
  // Cada llamada se guarda una sola vez, y una revisión lenta no pisa la llamada siguiente.
  const callId = useRef(0);
  const savedCall = useRef(0);

  const english = lang === "en";
  const [prefs, setPrefs] = useState<LivePrefs>(loadLivePrefs);
  const [memory, setMemory] = useState<string[]>([]);
  const focusRef = useRef<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [goalsDone, setGoalsDone] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [tab, setTab] = useState<"lines" | "report">("lines");
  const newCoachTurn = useRef(false);
  const wrappedUp = useRef(false);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updatePrefs(patch: Partial<LivePrefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      saveLivePrefs(next);
      return next;
    });
  }

  // Lo que el coach ya sabe: recuerdos de charlas y errores que se repiten.
  useEffect(() => {
    if (!english) return;
    let cancelled = false;
    void loadMemory(userId)
      .then((facts) => {
        if (!cancelled) setMemory(facts);
      })
      .catch(() => {
        /* sin memoria la llamada funciona igual */
      });
    void loadErrorRows(userId)
      .then((rows) => {
        focusRef.current = summarizeErrors(rows)
          .stats.slice(0, 3)
          .map((st) => errorLabel(st.type));
      })
      .catch(() => {
        /* sin historial no hay foco */
      });
    return () => {
      cancelled = true;
    };
  }, [userId, english]);

  useEffect(() => () => {
    if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
  }, []);

  /** Agrega al registro y devuelve el turno completo en curso. */
  function appendLog(who: "learner" | "coach", text: string): string {
    const log = logRef.current;
    const last = log[log.length - 1];
    const sameTurn = last && last.who === who && !(who === "coach" && newCoachTurn.current);
    if (who === "coach") newCoachTurn.current = false;
    if (sameTurn) {
      last.text += text;
      return last.text;
    }
    log.push({ who, text });
    return text;
  }

  function start(c: Choice) {
    setChoice(c);
    setState("connecting");
    setSeconds(0);
    setSaid("");
    setHeard("");
    logRef.current = [];
    correctionsRef.current = [];
    setCorrections([]);
    setTip(null);
    setReport(null);
    setReportState("idle");
    reportRequested.current = false;
    setReview(EMPTY_REVIEW);
    setGoalsDone([]);
    setMuted(false);
    setThinking(false);
    setStuck(false);
    setTab("lines");
    newCoachTurn.current = false;
    wrappedUp.current = false;
    callId.current++;
    startedAt.current = null;
    rewarded.current = false;
    setXp(0);
    const chosen = c.kind === "free" ? null : c.kind === "situation" ? c.situation : pickSurprise(bank);
    const situation = chosen ? toLiveSituation(chosen) : null;
    const callGoals = english && chosen ? goalsFor(chosen.id) : [];
    setGoals(callGoals);
    const session = new LiveSession(
      {
        onState: (s, d) => {
          setState(s);
          if (d) setDetail(d);
          if (s === "live") startedAt.current = Date.now();
        },
        onHeard: (tx) => {
          setHeard(appendLog("learner", tx));
          setStuck(false);
          // Si deja de hablar y el coach aún no contesta, está pensando.
          setThinking(false);
          if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
          thinkingTimer.current = setTimeout(() => setThinking(true), THINKING_AFTER_MS);
        },
        onSaid: (tx) => {
          setSaid(appendLog("coach", tx));
        },
        onSpeaking: (on) => {
          setSpeaking(on);
          if (on) {
            if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
            setThinking(false);
            setStuck(false);
          }
        },
        onGoal: (index) => setGoalsDone((done) => (done.includes(index) ? done : [...done, index])),
        onCorrection: (cor) => {
          correctionsRef.current = [...correctionsRef.current, cor];
          setCorrections(correctionsRef.current);
          setTip(cor);
        },
      },
      {
        level,
        name,
        topic: c.kind === "free" ? topic : null,
        situation,
        lang,
        ...(english ? { correction: prefs.correction, goals: callGoals, memory, focus: focusRef.current } : {}),
      }
    );
    sessionRef.current = session;
    void session.start();
  }

  // Al cerrar la pantalla, cortar la sesión.
  useEffect(() => () => sessionRef.current?.stop(), []);

  // La pista rápida se retira sola a los 9 segundos.
  useEffect(() => {
    if (!tip) return;
    const tm = setTimeout(() => setTip(null), 9000);
    return () => clearTimeout(tm);
  }, [tip]);

  // Al terminar, el profesor escribe el informe (solo si el alumno habló al menos dos veces).
  useEffect(() => {
    if (state !== "ended" || reportRequested.current) return;
    reportRequested.current = true;
    const learnerTurns = logRef.current.filter((e) => e.who === "learner").length;
    if (learnerTurns < 2) return;
    setReportState("loading");
    const transcript = logRef.current
      .map((e) => `${e.who === "learner" ? "L" : "C"}: ${e.text.trim()}`)
      .join("\n")
      .slice(-12000);
    liveReport({ transcript, corrections: correctionsRef.current, level, lang })
      .then((r) => {
        setReport(r);
        setReportState(r ? "done" : "error");
      })
      .catch(() => setReportState("error"));
  }, [state, level, lang]);

  // Al terminar (también si se cortó): revisión frase por frase y guardado de la
  // llamada. Sigue aunque se cierre la pantalla.
  useEffect(() => {
    if ((state !== "ended" && state !== "error") || startedAt.current === null) return;
    const id = callId.current;
    if (savedCall.current === id) return;
    const turns = toTurns(logRef.current);
    if (!turns.some((turn) => turn.role === "user")) return;
    savedCall.current = id;
    void finishCall(id, turns, startedAt.current, Date.now());
    // Solo reacciona al fin de la llamada; finishCall lee lo de ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function finishCall(id: number, turns: ReturnType<typeof toTurns>, started: number, ended: number) {
    const show = (patch: Partial<CallReviewState>) => {
      if (callId.current === id) setReview((r) => ({ ...r, ...patch }));
    };
    const topicTitle =
      choice?.kind === "situation" ? choice.situation.title : choice?.kind === "surprise" ? t("live.surpriseCall") : (topic ?? t("live.freeTitle"));
    const fallback = mistakesFromCorrections(correctionsRef.current);
    // La revisión frase por frase está solo en inglés.
    let data: CallReviewData | null = null;
    if (lang === "en") {
      show({ status: "loading", turns });
      data = await reviewCall(turns, level).catch(() => null);
    }
    const mistakes = data ? data.mistakes : fallback;
    show({ status: lang === "en" ? (data ? "done" : "error") : "idle", data, mistakes, saved: "saving" });
    const result = await saveCall({ userId, topic: topicTitle, turns, mistakes, startedAt: started, endedAt: ended }).catch(() => ({ ok: false }));
    show({ saved: result.ok ? "saved" : "failed" });
    if (data) {
      // Solo se recuerda lo de la charla libre: en un roleplay lo que se dice es inventado.
      const facts = choice?.kind === "free" ? data.facts : [];
      const score = data.scores ? { at: new Date(ended).toISOString(), ...data.scores } : null;
      const previous = await saveInsights(userId, { score, facts }).catch(() => []);
      show({ previous });
      if (facts.length) setMemory((m) => mergeMemory(m, facts));
    }
  }

  // Cronómetro mientras la llamada está en vivo.
  useEffect(() => {
    if (state !== "live") return;
    const tm = setInterval(() => setSeconds(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(tm);
  }, [state]);

  // Poco antes del tope, el coach se despide en vez de cortarse a mitad de frase.
  useEffect(() => {
    if (state !== "live" || wrappedUp.current || seconds < LIVE_MAX_SECONDS - WRAP_UP_SECONDS) return;
    wrappedUp.current = true;
    sessionRef.current?.sendInstruction("Time is almost up: wrap up warmly in one or two sentences and say goodbye");
  }, [state, seconds]);

  // Silencio largo después del coach: se resalta la ayuda.
  const lastWho = logRef.current[logRef.current.length - 1]?.who;
  useEffect(() => {
    if (state !== "live" || speaking || muted || lastWho !== "coach") return;
    const tm = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(tm);
  }, [state, speaking, muted, lastWho, said]);

  // Tope de tiempo: al llegar a 15 minutos la llamada se corta sola (y muestra el informe).
  useEffect(() => {
    if (state === "live" && seconds >= LIVE_MAX_SECONDS) endCall();
  }, [state, seconds]);

  // Al terminar: XP según los minutos hablados (tope 20, una vez por llamada).
  useEffect(() => {
    if ((state !== "ended" && state !== "error") || rewarded.current || startedAt.current === null) return;
    rewarded.current = true;
    const secs = Math.round((Date.now() - startedAt.current) / 1000);
    if (secs >= 60) {
      const amount = Math.min(20, Math.round(secs / 20));
      setXp(amount);
      void awardXp(userId, { source: "conversation", refKey: `live:${startedAt.current}`, amount, meta: { live: true, seconds: secs } });
    }
  }, [state, userId]);

  function endCall() {
    sessionRef.current?.stop();
    setState("ended");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const left = Math.max(0, LIVE_MAX_SECONDS - seconds);
  const remaining = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const nearEnd = state === "live" && left <= 60;
  const progress = Math.min(1, seconds / LIVE_MAX_SECONDS);

  if (state === "pick") {
    return (
      <LivePicker
        t={t}
        english={english}
        topic={topic}
        bank={bank}
        correction={prefs.correction}
        onCorrection={(correction) => updatePrefs({ correction })}
        memory={memory}
        onForget={() => {
          void forgetMemory(userId).then((ok) => {
            if (ok) setMemory([]);
          });
        }}
        onFree={() => start({ kind: "free" })}
        onSurprise={() => start({ kind: "surprise" })}
        onSituation={(situation) => start({ kind: "situation", situation })}
        onClose={onClose}
      />
    );
  }

  const title = choice?.kind === "situation" ? choice.situation.title : choice?.kind === "surprise" ? t("live.surpriseCall") : (topic ?? t("live.freeTitle"));

  if (state === "ended" || state === "error") {
    const secs = seconds;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-ink-900 p-6" role="dialog" aria-label={t("live.summaryAria")}>
        <div className="card my-auto w-full max-w-lg animate-fade-up p-6">
          <div className="text-center">
            <p className="eyebrow mb-2">{t("live.beta")}</p>
            <h2 className="font-display text-2xl font-extrabold">{state === "error" ? t("live.couldNot") : t("live.ended")}</h2>
            {state === "error" && <p className="mt-2 text-sm text-coral">{detail}</p>}
            {state === "ended" && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ink-800 p-3">
                  <Clock className="mx-auto mb-1 text-paper-muted" size={16} aria-hidden />
                  <p className="font-mono text-lg font-bold">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p>
                  <p className="text-[11px] text-paper-faint">{t("live.talked")}</p>
                </div>
                <div className="rounded-xl bg-ink-800 p-3">
                  <Sparkles className="mx-auto mb-1 text-gold" size={16} aria-hidden />
                  <p className="font-mono text-lg font-bold">+{xp}</p>
                  <p className="text-[11px] text-paper-faint">XP</p>
                </div>
              </div>
            )}
          </div>
          {state === "ended" && goals.length > 0 && (
            <section aria-label="Goals" className="mt-4 rounded-xl bg-ink-800 p-3 text-left">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Target size={15} className="text-mint" aria-hidden /> Goals: {goalsDone.length} of {goals.length}
              </p>
              <ul className="space-y-1 text-sm">
                {goals.map((goal, i) => (
                  <li key={goal} className="flex items-start gap-2">
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${goalsDone.includes(i) ? "bg-mint text-ink-900" : "border border-paper-faint"}`} aria-hidden>
                      {goalsDone.includes(i) && <Check size={11} />}
                    </span>
                    <span className={goalsDone.includes(i) ? "" : "text-paper-muted"}>
                      {goal}
                      <span className="sr-only">{goalsDone.includes(i) ? " (done)" : " (not yet)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {english && state === "ended" && (
            <div role="tablist" aria-label="Call feedback" className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1">
              {([["lines", "Your lines"], ["report", "Teacher report"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`call-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`call-panel-${id}`}
                  onClick={() => setTab(id)}
                  className={`rounded-lg py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint ${tab === id ? "bg-ink-600 text-paper" : "text-paper-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {state === "ended" && (
            <div role={english ? "tabpanel" : undefined} id="call-panel-report" aria-labelledby={english ? "call-tab-report" : undefined} hidden={english && tab !== "report"}>
              <TeacherReport status={reportState} report={report} corrections={english ? [] : corrections} t={t} />
            </div>
          )}
          {english && (
            <div role="tabpanel" id="call-panel-lines" aria-labelledby="call-tab-lines" hidden={state === "ended" && tab !== "lines"}>
              <CallReview key={callId.current} userId={userId} level={level} review={review} />
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setState("pick")} className="btn-coral inline-flex items-center justify-center gap-2">
              <RotateCcw size={16} /> {t("live.pickAnother")}
            </button>
            <button onClick={onClose} className="btn-ghost inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> {t("live.backSpeak")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mode: TutorMode =
    state === "connecting" ? "connecting" : muted && !speaking ? "muted" : speaking ? "speaking" : thinking ? "thinking" : "listening";

  return (
    <LiveStage
      t={t}
      english={english}
      level={level}
      title={title}
      mode={mode}
      live={state === "live"}
      timer={`${mm}:${ss} · ${nearEnd ? t("live.endsIn", { t: remaining }) : t("live.maxMin", { n: Math.round(LIVE_MAX_SECONDS / 60) })}`}
      nearEnd={nearEnd}
      progress={progress}
      coachLine={said}
      learnerLine={heard}
      tip={tip}
      goals={goals}
      goalsDone={goalsDone}
      stuck={stuck}
      muted={muted}
      captions={prefs.captions}
      getLevel={() => sessionRef.current?.outputLevel?.() ?? 0}
      onToggleMute={() => {
        sessionRef.current?.setMuted?.(!muted);
        setMuted(!muted);
        setStuck(false);
      }}
      onToggleCaptions={() => updatePrefs({ captions: !prefs.captions })}
      onRequest={(instruction) => {
        newCoachTurn.current = true;
        setStuck(false);
        sessionRef.current?.sendInstruction?.(instruction);
      }}
      onHangUp={endCall}
    />
  );
}

function toLiveSituation(s: Situation): LiveSituation {
  return {
    title: s.title,
    coachRole: s.roleplay.coachRole,
    opening: s.roleplay.opening,
    description: s.roleplay.description,
  };
}

/** Informe del profesor nativo al colgar: qué hiciste bien, qué mejorar y qué seguir practicando. */
function TeacherReport({
  status,
  report,
  corrections,
  t,
}: {
  status: "idle" | "loading" | "done" | "error";
  report: LiveReport | null;
  corrections: LiveCorrection[];
  t: T;
}) {
  if (status === "loading") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-paper-muted" role="status">
        <Loader2 className="animate-spin" size={16} /> {t("live.reportWriting")}
      </div>
    );
  }
  if (status === "idle") {
    return <p className="mt-6 text-center text-sm text-paper-muted">{t("live.reportLater")}</p>;
  }
  if (status === "error" || !report) {
    return <p className="mt-6 text-center text-sm text-coral">{t("live.reportFail")}</p>;
  }

  return (
    <section aria-label={t("live.reportTitle")} className="mt-6 space-y-5 text-left">
      <div>
        <p className="eyebrow mb-1">{t("live.reportTitle")}</p>
        {report.overall && <p className="text-sm leading-relaxed">{report.overall}</p>}
        {report.levelNote && <p className="mt-2 text-xs text-paper-muted">{report.levelNote}</p>}
      </div>

      {report.strengths.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-mint">{t("live.doneWell")}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {report.priorities.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-coral">{t("live.improve")}</h3>
          <ol className="space-y-3">
            {report.priorities.map((p, i) => (
              <li key={i} className="rounded-lg bg-ink-800 p-3 text-sm">
                <p className="font-semibold">{p.issue}</p>
                {p.youSaid && <p className="mt-1 text-paper-muted">{t("live.youSaid", { t: "" })}<em>“{p.youSaid}”</em></p>}
                {p.better && <p>{t("live.better", { t: "" })}<strong>{p.better}</strong></p>}
                {p.why && <p className="mt-1 text-xs text-paper-muted">{p.why}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {report.vocabulary.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("live.keep")}</h3>
          <ul className="flex flex-wrap gap-2 text-xs">
            {report.vocabulary.map((v, i) => (
              <li key={i} className="rounded-full bg-ink-700 px-3 py-1">
                <strong>{v.en}</strong> <span className="text-paper-muted">— {v.es}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.nextSteps.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("live.nextTime")}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {report.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {corrections.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-paper-muted">{t("live.tipsDuring", { n: corrections.length })}</summary>
          <ul className="mt-2 space-y-2">
            {corrections.map((c, i) => (
              <li key={i}>
                <span className="text-paper-faint line-through">{c.original}</span> → <strong>{c.correction}</strong>
                {c.explanation && <span className="block text-xs text-paper-muted">{c.explanation}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function pickSurprise(bank: Situation[]): Situation {
  return bank[Math.floor(Math.random() * bank.length)];
}
