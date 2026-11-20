import { useEffect, useRef, useState } from "react";
import { Loader2, PhoneOff, Phone } from "lucide-react";
import { LiveSession, LIVE_MAX_SECONDS, type LiveSituation } from "../lib/liveSession";
import { SITUATIONS } from "../lib/situationsData";
import { awardXp } from "../lib/xp";

type Choice = { kind: "free" } | { kind: "situation"; situation: LiveSituation } | { kind: "surprise" };

/**
 * Llamada en tiempo real con el coach (voz a voz, BETA).
 * Primero se elige el modo: charla libre, una situación (el coach llama y abre la
 * conversación) o sorpresa. Tope de 15 minutos. Al colgar entrega XP según el tiempo.
 */
export default function LiveCall({
  userId,
  level,
  name,
  topic,
  onClose,
}: {
  userId: string;
  level: string;
  name: string;
  topic: string | null;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [state, setState] = useState<"pick" | "connecting" | "live" | "ended" | "error">("pick");
  const [detail, setDetail] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [said, setSaid] = useState("");
  const [seconds, setSeconds] = useState(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const startedAt = useRef<number | null>(null);
  const rewarded = useRef(false);

  function start(c: Choice) {
    setChoice(c);
    setState("connecting");
    const situation = c.kind === "free" ? null : c.kind === "situation" ? c.situation : pickSurprise();
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
      void awardXp(userId, { source: "conversation", refKey: `live:${startedAt.current}`, amount: Math.min(20, Math.round(secs / 20)), meta: { live: true, seconds: secs } });
    }
  }, [state, userId]);

  function hangUp() {
    sessionRef.current?.stop();
    onClose();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const left = Math.max(0, LIVE_MAX_SECONDS - seconds);
  const remaining = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const nearEnd = state === "live" && left <= 60;

  if (state === "pick") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-ink-900 p-6" role="dialog" aria-label="Choose a live call">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Live call · beta</p>
          <button onClick={onClose} className="text-xs text-paper-muted hover:text-coral" aria-label="Close">Cancel</button>
        </div>
        <h2 className="page-title mt-3 mb-1">Pick a call</h2>
        <p className="text-sm text-paper-muted mb-4">Up to 15 minutes. You can hang up any time.</p>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          <button onClick={() => start({ kind: "free" })} className="card-interactive w-full p-4 text-left">
            <p className="font-display font-bold">Free chat</p>
            <p className="text-xs text-paper-muted">{topic ?? "Talk about anything, the coach will suggest a topic."}</p>
          </button>
          <button onClick={() => start({ kind: "surprise" })} className="card-interactive w-full p-4 text-left">
            <p className="font-display font-bold">Surprise me</p>
            <p className="text-xs text-paper-muted">A random situation: the coach calls you.</p>
          </button>
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => start({ kind: "situation", situation: toLiveSituation(s) })}
              className="card-interactive w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold">{s.title}</p>
                <span className="text-[10px] font-mono uppercase tracking-widest text-paper-faint">{s.level}</span>
              </div>
              <p className="text-xs text-paper-muted">{s.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = choice?.kind === "situation" ? choice.situation.title : choice?.kind === "surprise" ? "Surprise call" : (topic ?? "Free chat");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-ink-900 p-6" role="dialog" aria-label="Live call">
      <div className="pt-6 text-center">
        <p className="eyebrow">Live call · beta</p>
        <p className="mt-1 text-xs text-paper-faint">{title}</p>
        {state === "live" && (
          <p className={`mt-1 font-mono text-xs ${nearEnd ? "text-gold" : "text-mint"}`} aria-live="off">
            {mm}:{ss} · {nearEnd ? `ends in ${remaining}` : `max ${Math.round(LIVE_MAX_SECONDS / 60)} min`}
          </p>
        )}
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <div
          className={`mx-auto grid h-28 w-28 place-items-center rounded-full border-2 transition ${
            state === "live" ? (speaking ? "border-coral bg-coral/20 animate-pulse" : "border-mint bg-mint/10") : "border-ink-500"
          }`}
          aria-hidden
        >
          {state === "connecting" ? <Loader2 className="animate-spin text-paper-muted" /> : <span className="text-3xl">{speaking ? "🗣️" : "🎧"}</span>}
        </div>
        <p className="font-display text-xl font-bold" role="status">
          {state === "connecting" && "Connecting…"}
          {state === "live" && (speaking ? "They're talking…" : "Your turn — just speak")}
          {state === "ended" && "Call ended"}
          {state === "error" && "Could not connect"}
        </p>
        {state === "error" && <p className="text-sm text-coral">{detail}</p>}
        {state === "live" && (
          <div className="min-h-[5rem] space-y-1 text-sm">
            {said && <p className="text-paper-muted">{said}</p>}
            {heard && <p className="italic text-paper-faint">You: {heard}</p>}
          </div>
        )}
        {state === "live" && <p className="text-[11px] text-paper-faint">Tip: headphones avoid echo. You can interrupt at any time.</p>}
      </div>

      <div className="pb-6 flex flex-col items-center gap-3">
        {(state === "error" || state === "ended") && (
          <button onClick={() => setState("pick")} className="btn-coral inline-flex items-center gap-2">
            <Phone size={16} /> Pick another call
          </button>
        )}
        <button onClick={hangUp} className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white" aria-label="Hang up">
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
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

function pickSurprise(): LiveSituation {
  const s = SITUATIONS[Math.floor(Math.random() * SITUATIONS.length)];
  return toLiveSituation(s);
}
