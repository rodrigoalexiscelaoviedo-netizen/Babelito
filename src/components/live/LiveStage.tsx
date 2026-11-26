import { useState, type ReactNode } from "react";
import { Captions, CaptionsOff, Check, Gauge, Languages, Lightbulb, Loader2, Mic, MicOff, PhoneOff, Repeat2, Sparkles, X } from "lucide-react";
import TutorStage, { type TutorMode } from "./TutorStage";
import type { LiveCorrection } from "../../lib/liveSession";
import { suggestReplies, translateToSpanish, type Suggestion } from "../../lib/liveHelp";
import type { tFor } from "../../i18n";

/** Pedidos de voz que la persona puede hacer tocando un botón. */
const VOICE_REQUESTS = [
  { id: "again", label: "Say again", icon: Repeat2, text: "Say your last message again, the same way" },
  { id: "slower", label: "Slower", icon: Gauge, text: "From now on speak more slowly. Say your last message again, slowly" },
  { id: "simpler", label: "Simpler", icon: Sparkles, text: "Say your last message again using easier words and a shorter sentence" },
] as const;

export interface LiveStageProps {
  t: ReturnType<typeof tFor>;
  /** Ayudas y controles nuevos: solo inglés. */
  english: boolean;
  level: string;
  title: string;
  mode: TutorMode;
  live: boolean;
  /** Tiempo ya formateado, o aviso de que queda poco. */
  timer: string;
  nearEnd: boolean;
  progress: number;
  /** Turno actual del coach, completo. */
  coachLine: string;
  /** Último turno de la persona. */
  learnerLine: string;
  tip: LiveCorrection | null;
  goals: string[];
  goalsDone: number[];
  stuck: boolean;
  muted: boolean;
  captions: boolean;
  getLevel: () => number;
  onToggleMute: () => void;
  onToggleCaptions: () => void;
  onRequest: (instruction: string) => void;
  onHangUp: () => void;
}

type Help =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "hints"; items: Suggestion[] }
  | { kind: "error" };

/** La llamada en pantalla, con forma de videollamada: coach, subtítulos, ayudas y controles. */
export default function LiveStage(p: LiveStageProps) {
  const { t, english, live } = p;
  // Ideas y traducción quedan atadas al turno del coach: en el siguiente ya no sirven.
  const turn = p.coachLine.slice(0, 24);
  const [helpState, setHelpState] = useState<{ turn: string; help: Help }>({ turn: "", help: { kind: "closed" } });
  const [translationState, setTranslationState] = useState<{ turn: string; source: string; text: string | null } | null>(null);
  const help: Help = helpState.turn === turn ? helpState.help : { kind: "closed" };
  const translation = translationState?.turn === turn ? translationState : null;
  const closeHelp = () => setHelpState({ turn, help: { kind: "closed" } });

  async function askHints() {
    if (help.kind !== "closed" && help.kind !== "error") {
      closeHelp();
      return;
    }
    setHelpState({ turn, help: { kind: "loading" } });
    const items = await suggestReplies(p.coachLine, p.level).catch(() => []);
    setHelpState((cur) =>
      cur.turn === turn && cur.help.kind === "loading" ? { turn, help: items.length ? { kind: "hints", items } : { kind: "error" } } : cur
    );
  }

  async function translate() {
    if (translation) {
      setTranslationState(null);
      return;
    }
    const source = p.coachLine;
    setTranslationState({ turn, source, text: null });
    const text = await translateToSpanish(source).catch(() => "");
    setTranslationState((cur) => (cur?.source === source ? { ...cur, text: text || "We couldn't translate that." } : cur));
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-ink-900" role="dialog" aria-label={t("live.callAria")}>
      <div className="h-1 w-full bg-ink-700" aria-hidden>
        <div className={`h-1 transition-[width] duration-1000 ease-linear ${p.nearEnd ? "bg-gold" : "bg-mint"}`} style={{ width: `${p.progress * 100}%` }} />
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-4 pt-3">
        <header className="flex shrink-0 items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-display font-bold">{p.title}</p>
          {live && <p className={`shrink-0 font-mono text-xs ${p.nearEnd ? "text-gold" : "text-paper-muted"}`}>{p.timer}</p>}
        </header>

        {live && p.goals.length > 0 && (
          <ul className="grid shrink-0 grid-cols-3 gap-2" aria-label="Your goals for this call">
            {p.goals.map((goal, i) => {
              const done = p.goalsDone.includes(i);
              return (
                <li
                  key={goal}
                  className={`flex items-start gap-1.5 rounded-xl border p-2 text-[11px] leading-snug sm:text-xs ${done ? "border-mint/50 bg-mint/10" : "border-ink-600 bg-ink-800"}`}
                >
                  <span className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full ${done ? "bg-mint text-ink-900" : "border border-paper-faint"}`} aria-hidden>
                    {done && <Check size={11} />}
                  </span>
                  <span>
                    {goal}
                    {done && <span className="sr-only"> (done)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <TutorStage mode={p.mode} name="Babelito" label={labelFor(p.mode, t)} getLevel={p.getLevel} />

        <div className="max-h-[38vh] min-h-[4rem] shrink overflow-y-auto">
          {p.tip && live && (
            <div role="status" className="mb-2 animate-fade-up rounded-xl border border-gold/40 bg-ink-800 px-4 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gold">{t("live.quickTip")}</p>
              <p className="text-sm">
                <span className="text-paper-faint line-through">{p.tip.original}</span> → <strong>{p.tip.correction}</strong>
              </p>
              {p.tip.explanation && <p className="text-xs text-paper-muted">{p.tip.explanation}</p>}
            </div>
          )}

          {help.kind !== "closed" && live && (
            <section aria-label="Ideas to answer" className="mb-2 animate-fade-up rounded-xl border border-mint/40 bg-ink-800 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-mint">You could say</p>
                <button type="button" onClick={closeHelp} aria-label="Close ideas" className="p-1 text-paper-faint hover:text-paper">
                  <X size={14} aria-hidden />
                </button>
              </div>
              {help.kind === "loading" && <Loader2 size={16} className="mx-auto animate-spin motion-reduce:animate-none" aria-label="Loading ideas" />}
              {help.kind === "error" && <p className="text-sm text-coral">We couldn't get ideas right now. Try again.</p>}
              {help.kind === "hints" && (
                <ul className="space-y-1.5">
                  {help.items.map((s) => (
                    <li key={s.en}>
                      <p className="text-sm font-medium">{s.en}</p>
                      {s.es && <p className="text-xs text-paper-muted">{s.es}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {p.captions && live && (p.coachLine || p.learnerLine) && (
            <div className="space-y-2">
              {p.coachLine && (
                <div className="rounded-2xl bg-ink-700 px-4 py-3">
                  <p className="max-h-24 overflow-y-auto text-sm leading-relaxed">{p.coachLine}</p>
                  {translation && (
                    <p className="mt-1 border-t border-ink-500 pt-1 text-sm text-paper-muted" lang="es">
                      {translation.text ?? "Translating…"}
                    </p>
                  )}
                  {english && (
                    <button type="button" onClick={translate} aria-pressed={!!translation} className="mt-1 inline-flex items-center gap-1 py-1 text-xs text-paper-muted hover:text-coral">
                      <Languages size={13} aria-hidden /> {translation ? "Hide Spanish" : "In Spanish"}
                    </button>
                  )}
                </div>
              )}
              {p.learnerLine && <p className="line-clamp-2 px-1 text-right text-sm italic text-paper-muted">{t("live.youLine", { t: p.learnerLine })}</p>}
            </div>
          )}
        </div>

        {english && live && (
          <div className="grid shrink-0 grid-cols-4 gap-2">
            <HelpButton icon={<Lightbulb size={16} aria-hidden />} label={p.stuck ? "Stuck? Hint" : "Hint"} onClick={askHints} highlight={p.stuck} disabled={!p.coachLine} />
            {VOICE_REQUESTS.map((r) => (
              <HelpButton key={r.id} icon={<r.icon size={16} aria-hidden />} label={r.label} onClick={() => p.onRequest(r.text)} disabled={!p.coachLine} />
            ))}
          </div>
        )}

        {live && <p className="hidden shrink-0 text-center text-[11px] text-paper-faint [@media(min-height:700px)]:block">{t("live.headphones")}</p>}
      </div>

      <div className="flex items-center justify-center gap-6 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <ControlButton label={p.muted ? "Unmute" : "Mute"} pressed={p.muted} onClick={p.onToggleMute} disabled={!live}>
          {p.muted ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
        </ControlButton>
        <button
          type="button"
          onClick={p.onHangUp}
          className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/40 active:scale-95"
          aria-label={t("live.hangUp")}
        >
          <PhoneOff size={22} aria-hidden />
        </button>
        <ControlButton label="Captions" pressed={p.captions} onClick={p.onToggleCaptions}>
          {p.captions ? <Captions size={20} aria-hidden /> : <CaptionsOff size={20} aria-hidden />}
        </ControlButton>
      </div>
    </div>
  );
}

function labelFor(mode: TutorMode, t: LiveStageProps["t"]): string {
  if (mode === "connecting") return t("live.connecting");
  if (mode === "speaking") return t("live.coachTalking");
  if (mode === "thinking") return "Thinking…";
  if (mode === "muted") return "You're muted";
  return t("live.yourTurn");
}

function HelpButton({ icon, label, onClick, highlight, disabled }: { icon: ReactNode; label: string; onClick: () => void; highlight?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint disabled:opacity-40 ${
        highlight ? "border-mint bg-mint/15 text-mint" : "border-ink-600 bg-ink-800 text-paper hover:border-paper-faint"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ControlButton({ label, pressed, onClick, disabled, children }: { label: string; pressed: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper disabled:opacity-40 ${
        pressed ? "border-paper bg-paper text-ink-900" : "border-ink-500 bg-ink-800 text-paper"
      }`}
    >
      {children}
    </button>
  );
}
