import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2, Mic, MessageCircle, Phone, PhoneOff, RotateCcw, Sparkles, Clock } from "lucide-react";
import { LiveSession, LIVE_MAX_SECONDS, type LiveSituation } from "../lib/liveSession";
import { SITUATIONS } from "../lib/situationsData";
import { SITUATION_ICONS } from "./situationIcons";
import { awardXp } from "../lib/xp";

type Choice = { kind: "free" } | { kind: "situation"; situation: LiveSituation } | { kind: "surprise" };
type State = "pick" | "connecting" | "live" | "ended" | "error";

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
}: LiveCallProps) {
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

  function start(c: Choice) {
    setChoice(c);
    setState("connecting");
    setSeconds(0);
    setSaid("");
    setHeard("");
    const situation = c.kind === "free" ? null : c.kind === "situation" ? c.situation : pickSurprise().situation;
    const session = new LiveSession(
      {
        onState: (s, d) => {
          setState(s);
          if (d) setDetail(d);
          if (s === "live") startedAt.current = Date.now();
        },
        onHeard: (t) => setHeard((prev) => (prev + t).slice(-220)),
        onSaid: (t) => setSaid((prev) => (prev + t).slice(-260)),
        onSpeaking: setSpeaking,
      },
      { level, name, topic: c.kind === "free" ? topic : null, situation }
    );
    sessionRef.current = session;
    void session.start();
  }

  function hangUp() {
    sessionRef.current?.stop();
    onClose();
  }

  // Al cerrar la pantalla, cortar la sesión.
  useEffect(() => () => sessionRef.current?.stop(), []);

  // Cronómetro mientras la llamada está en vivo.
  useEffect(() => {
    if (state !== "live") return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  // Tope de tiempo: al llegar a 15 minutos la llamada se corta sola.
  useEffect(() => {
    if (state === "live" && seconds >= LIVE_MAX_SECONDS) hangUp();
    // hangUp es estable en uso; solo interesa el tiempo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink-900 p-6" role="dialog" aria-label="Choose a live call">
        <div className="mx-auto w-full max-w-2xl animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-2">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              Live · beta
            </p>
            <button onClick={onClose} className="text-xs text-paper-muted hover:text-coral" aria-label="Close">Cancel</button>
          </div>
          <h2 className="page-title mt-3 mb-1">Pick a call</h2>
          <p className="mb-6 text-sm text-paper-muted">Up to 15 minutes. You can hang up any time.</p>

          <div className="grid gap-3 sm:grid-cols-2 stagger">
            <ChoiceCard onClick={() => start({ kind: "free" })} icon={MessageCircle} title="Free chat" text={topic ?? "Talk about anything, the coach will suggest a topic."} />
            <ChoiceCard onClick={() => start({ kind: "surprise" })} icon={Sparkles} title="Surprise me" text="A random situation: the coach calls you." />
          </div>

          <p className="mb-3 mt-8 eyebrow">Real-life calls</p>
          <div className="grid gap-3 sm:grid-cols-2 stagger">
            {SITUATIONS.map((s) => {
              const Icon = SITUATION_ICONS[s.icon] ?? Phone;
              return (
                <button
                  key={s.id}
                  onClick={() => start({ kind: "situation", situation: toLiveSituation(s) })}
                  className="hub-card group flex items-start gap-3 p-4 text-left"
                  style={{ ["--accent-rgb" as string]: "var(--coral)" } as CSSProperties}
                >
                  <span className="hub-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[rgb(var(--accent-rgb))]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold">{s.title}</span>
                      <span className="rounded bg-ink-600 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">{s.level}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-paper-muted">{s.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const title = choice?.kind === "situation" ? choice.situation.title : choice?.kind === "surprise" ? "Surprise call" : (topic ?? "Free chat");

  if (state === "ended" || state === "error") {
    const secs = seconds;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-900 p-6" role="dialog" aria-label="Call summary">
        <div className="card w-full max-w-sm animate-fade-up p-6 text-center">
          <p className="eyebrow mb-2">Live · beta</p>
          <h2 className="font-display text-2xl font-extrabold">{state === "error" ? "Could not connect" : "Call ended"}</h2>
          {state === "error" && <p className="mt-2 text-sm text-coral">{detail}</p>}
          {state === "ended" && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-ink-800 p-3">
                <Clock className="mx-auto mb-1 text-paper-muted" size={16} aria-hidden />
                <p className="font-mono text-lg font-bold">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p>
                <p className="text-[11px] text-paper-faint">talked</p>
              </div>
              <div className="rounded-xl bg-ink-800 p-3">
                <Sparkles className="mx-auto mb-1 text-gold" size={16} aria-hidden />
                <p className="font-mono text-lg font-bold">+{xp}</p>
                <p className="text-[11px] text-paper-faint">XP</p>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setState("pick")} className="btn-coral inline-flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Pick another call
            </button>
            <button onClick={onClose} className="btn-ghost inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Speak
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coachLive = state === "live" && speaking;
  const userLive = state === "live" && !speaking;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-ink-900 p-6" role="dialog" aria-label="Live call">
      {/* Fondo: un halo que cambia de color según quién habla. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${coachLive ? "opacity-100" : "opacity-60"}`}
        style={{
          background: coachLive
            ? "radial-gradient(60% 50% at 50% 40%, rgb(var(--coral) / 0.22), transparent 70%)"
            : "radial-gradient(60% 50% at 50% 40%, rgb(var(--mint) / 0.16), transparent 70%)",
        }}
      />

      <div className="relative pt-6 text-center animate-fade-up">
        <p className="eyebrow">Live call · beta</p>
        <p className="mt-1 text-xs text-paper-faint">{title}</p>
        {state === "live" && (
          <p className={`mt-1 font-mono text-xs ${nearEnd ? "text-gold" : "text-mint"}`}>
            {mm}:{ss} · {nearEnd ? `ends in ${remaining}` : `max ${Math.round(LIVE_MAX_SECONDS / 60)} min`}
          </p>
        )}
      </div>

      <div className="relative w-full max-w-md space-y-6 text-center">
        <div className="relative mx-auto grid h-44 w-44 place-items-center" aria-hidden>
          {/* Anillo de progreso del tiempo */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" fill="none" className="stroke-ink-600" strokeWidth="2" />
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              className={nearEnd ? "stroke-gold" : "stroke-mint"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 47}
              strokeDashoffset={2 * Math.PI * 47 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          {/* Anillos que salen del orbe cuando habla el coach */}
          {coachLive &&
            [0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute inset-4 rounded-full border-2 border-coral/60 motion-safe:animate-live-ring"
                style={{ animationDelay: `${i * 0.6}s` }}
              />
            ))}
          {/* Respiración suave cuando te toca hablar */}
          {userLive && <span className="absolute inset-4 rounded-full bg-mint/20 motion-safe:animate-live-breathe" />}

          <span
            className={`relative grid h-28 w-28 place-items-center rounded-full transition-colors duration-500 ${
              coachLive ? "bg-coral text-white shadow-[0_0_60px_-8px_rgb(var(--coral)/0.8)]" : userLive ? "bg-mint/25 text-mint" : "bg-ink-700 text-paper-muted"
            }`}
          >
            {state === "connecting" ? (
              <Loader2 className="animate-spin" size={30} />
            ) : coachLive ? (
              <div className="flex h-8 items-end gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="motion-safe:animate-live-bar h-2 w-1 rounded-full bg-white" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            ) : (
              <Mic size={30} />
            )}
          </span>
        </div>

        <p className="font-display text-xl font-bold" role="status">
          {state === "connecting" && "Connecting…"}
          {state === "live" && (speaking ? "They're talking…" : "Your turn — just speak")}
        </p>

        {state === "live" && (
          <div className="min-h-[5.5rem] space-y-2 text-sm">
            {said && (
              <p key={said.slice(-30)} className="rounded-xl bg-ink-800/70 px-4 py-2 text-paper-muted animate-fade-up">
                {said}
              </p>
            )}
            {heard && (
              <p key={heard.slice(-30)} className="italic text-paper-faint animate-fade-up">
                You: {heard}
              </p>
            )}
          </div>
        )}
        {state === "live" && <p className="text-[11px] text-paper-faint">Tip: headphones avoid echo. You can interrupt at any time.</p>}
      </div>

      <div className="relative flex flex-col items-center gap-3 pb-6">
        <button
          onClick={endCall}
          className="group relative grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white transition hover:scale-105 active:scale-95"
          aria-label="Hang up"
        >
          <span className="absolute inset-0 rounded-full bg-red-600/40 motion-safe:animate-ping" aria-hidden />
          <PhoneOff size={22} className="relative" />
        </button>
        <span className="text-[11px] text-paper-faint">Hang up</span>
      </div>
    </div>
  );
}

function ChoiceCard({
  onClick,
  icon: Icon,
  title,
  text,
}: {
  onClick: () => void;
  icon: typeof MessageCircle;
  title: string;
  text: string;
}) {
  return (
    <button onClick={onClick} className="hub-card group flex items-start gap-3 p-5 text-left" style={{ ["--accent-rgb" as string]: "var(--mint)" } as CSSProperties}>
      <span className="hub-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[rgb(var(--accent-rgb))]">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-paper-muted">{text}</span>
      </span>
    </button>
  );
}

function toLiveSituation(s: (typeof SITUATIONS)[number]): LiveSituation {
  return {
    title: s.title,
    coachRole: s.roleplay.coachRole,
    opening: s.roleplay.opening,
    description: s.roleplay.description,
  };
}

function pickSurprise(): { situation: LiveSituation } {
  const s = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];
  return { situation: toLiveSituation(s) };
}
