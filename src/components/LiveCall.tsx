import { useEffect, useRef, useState } from "react";
import { Loader2, PhoneOff } from "lucide-react";
import { LiveSession } from "../lib/liveSession";
import { awardXp } from "../lib/xp";

/**
 * Llamada en tiempo real con el coach (voz a voz, BETA). Se abre sola al montarse
 * y al colgar entrega un poco de XP según el tiempo hablado.
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
  const [state, setState] = useState<"connecting" | "live" | "ended" | "error">("connecting");
  const [detail, setDetail] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [said, setSaid] = useState("");
  const [seconds, setSeconds] = useState(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const startedAt = useRef<number | null>(null);
  const rewarded = useRef(false);

  useEffect(() => {
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
      { level, name, topic }
    );
    sessionRef.current = session;
    void session.start();
    return () => session.stop();
    // La sesión se crea una sola vez por llamada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cronómetro mientras la llamada está en vivo.
  useEffect(() => {
    if (state !== "live") return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-ink-900 p-6" role="dialog" aria-label="Live call">
      <div className="pt-6 text-center">
        <p className="eyebrow">Live call · beta</p>
        <p className="mt-1 text-xs text-paper-faint">{topic ?? "Free chat"}</p>
        {state === "live" && <p className="mt-1 font-mono text-xs text-mint">{mm}:{ss}</p>}
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
        <p className="font-display text-xl font-bold">
          {state === "connecting" && "Connecting…"}
          {state === "live" && (speaking ? "Your coach is talking…" : "Your turn — just speak")}
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
        {state === "live" && <p className="text-[11px] text-paper-faint">Tip: headphones avoid echo. You can interrupt the coach at any time.</p>}
      </div>

      <div className="pb-6">
        <button onClick={hangUp} className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white" aria-label="Hang up">
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
