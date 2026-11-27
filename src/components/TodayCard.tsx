import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock,
  Flame,
  Headphones,
  Layers,
  MessageCircle,
  PenLine,
  Quote,
  Sparkles,
  Target,
  Type,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { activeItems, isTriadComplete, type DailyLesson, type LessonItem } from "../lib/dailyLesson";
import type { PlanTask } from "../lib/plan";
import type { WordDefinition } from "../lib/dictionary";
import { MIN_USER_TURNS } from "../lib/practice";
import { BrandDots } from "./Loader";
import { haptic } from "./Confetti";
import { tFor } from "../i18n";

export interface TodayCardProps {
  lang: string;
  lesson: DailyLesson | null;
  /** Tareas recomendadas del plan. La conversación ya está en la práctica del día. */
  tasks: PlanTask[];
  loading: boolean;
  error: string;
  itemError: string;
  completing: boolean;
  streak: number;
  freezesLeft: number;
  wordDef: WordDefinition | null;
  onRetry: () => void;
  onToggle: (item: LessonItem) => void;
  onComplete: () => void;
  onSpeak: (text: string) => void;
  /** Lo que va entre el camino del día y los extras (avisos de Inicio). */
  between?: ReactNode;
}

type Step = { key: LessonItem; label: string; icon: LucideIcon; done: boolean };

/**
 * El día en tres capas, de arriba abajo:
 *  1. "Lo próximo": UNA sola cosa, grande, con su botón.
 *  2. El camino del día: los pasos que cierran la racha, con el actual latiendo.
 *  3. Si queda tiempo: extras del plan (se tildan solos).
 */
export default function TodayCard(p: TodayCardProps) {
  const { lang, lesson, tasks, loading, error } = p;
  const t = tFor(lang);

  if (loading) {
    return (
      <div className="mb-8 space-y-4" aria-busy="true" aria-label="Loading today's practice">
        <div className="skeleton h-52 rounded-[1.75rem]" />
        <div className="skeleton h-24 rounded-xl2" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="card mb-8 p-6 text-center">
        <p className="mb-1 text-sm text-coral">{t("home.errLoad")}</p>
        {error && <p className="mb-3 text-xs text-paper-faint">{error}</p>}
        <button className="btn-coral px-4 py-2 text-sm" onClick={p.onRetry}>
          {t("home.tryAgain")}
        </button>
      </div>
    );
  }

  const items = activeItems(lesson);
  const steps: Step[] = [
    { key: "convo_done", label: t("home.stepTalk"), icon: MessageCircle, done: lesson.convo_done },
    { key: "chunk_done", label: t("home.stepPhrase"), icon: Quote, done: lesson.chunk_done },
    ...(lesson.word ? [{ key: "word_done" as const, label: t("home.stepWord"), icon: Type, done: lesson.word_done }] : []),
  ];
  const doneCount = items.filter((k) => lesson[k]).length;
  const allChecked = isTriadComplete(lesson);
  const next = steps.find((s) => !s.done) ?? null;
  const rail = { inset: 50 / steps.length, length: 100 - 100 / steps.length };

  const extras = tasks.filter((x) => x.id !== "talk");
  const extraMinutes = extras.filter((x) => !x.done).reduce((a, x) => a + x.minutes, 0);

  return (
    <div className="mb-8 space-y-8">
      <Hero {...p} next={next} allChecked={allChecked} />

      {/* ── El camino del día ─────────────────────────────────────────── */}
      {!lesson.completed && (
        <section aria-labelledby="path-title">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="path-title" className="font-display text-xl font-extrabold tracking-tight">
              {t("home.coreTitle")}
            </h2>
            <p className="text-sm tabular-nums text-paper-muted">{t("home.coreCount", { done: doneCount, total: items.length })}</p>
          </div>
          <ol className="relative flex items-start justify-between">
            {/* Riel de fondo entre el primer y el último paso, y riel lleno según lo hecho */}
            <span aria-hidden className="absolute top-6 h-1 rounded-full bg-ink-600" style={{ left: `${rail.inset}%`, right: `${rail.inset}%` }} />
            <span
              aria-hidden
              className="absolute top-6 h-1 rounded-full bg-mint transition-[width] duration-700 ease-out-expo"
              style={{ left: `${rail.inset}%`, width: `${rail.length * (doneCount / steps.length)}%` }}
            />
            {steps.map((s) => (
              <PathNode key={s.key} step={s} current={next?.key === s.key} t={t} onToggle={p.onToggle} />
            ))}
          </ol>
          {p.itemError && (
            <p className="mt-3 text-center text-xs text-coral" role="alert">
              {p.itemError}
            </p>
          )}
          {!lesson.word && <p className="mt-3 text-center text-xs text-paper-faint">{t("home.wordNotCounted")}</p>}
        </section>
      )}

      {p.between}

      {/* ── Si queda tiempo ───────────────────────────────────────────── */}
      {extras.length > 0 && (
        <section aria-labelledby="extras-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="extras-title" className="font-display text-xl font-extrabold tracking-tight">
              {t("home.extrasTitle")}
            </h2>
            {extraMinutes > 0 && <p className="text-sm text-paper-muted">{t("home.extrasMinutes", { n: extraMinutes })}</p>}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {extras.map((task) => {
              const look = EXTRA_LOOK[task.id] ?? EXTRA_LOOK.default;
              return (
                <li key={task.id}>
                  <Link
                    to={task.to}
                    className="card card-lift press group flex h-full items-center gap-4 p-4"
                  >
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${task.done ? "bg-mint text-ink-900" : look.tile}`}>
                      {task.done ? <Check size={22} aria-hidden /> : <look.icon size={22} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold leading-snug ${task.done ? "text-paper-muted line-through" : ""}`}>{task.title}</span>
                      <span className="mt-0.5 block text-xs text-paper-muted">{task.detail}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-paper-faint">
                      <span className="flex items-center gap-1">
                        <Clock size={11} aria-hidden /> {t("planui.minutes", { n: task.minutes })}
                      </span>
                      <ArrowRight size={16} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Color e icono de cada extra del plan (el color de la puerta a la que lleva). */
const EXTRA_LOOK: Record<string, { icon: LucideIcon; tile: string }> = {
  review: { icon: Layers, tile: "bg-mint/15 text-mint" },
  listen: { icon: Headphones, tile: "bg-sky/15 text-sky" },
  mission: { icon: Target, tile: "bg-coral/15 text-coral" },
  error: { icon: PenLine, tile: "bg-gold/20 text-gold" },
  default: { icon: Sparkles, tile: "bg-coral/15 text-coral" },
};

/* ─────────────────────────────────────────────────────────────────────────── */

function Hero(p: TodayCardProps & { next: Step | null; allChecked: boolean }) {
  const { lesson, lang } = p;
  const t = tFor(lang);
  if (!lesson) return null;

  // Día cerrado: el héroe festeja y deja la racha a la vista.
  if (lesson.completed) {
    return (
      <section className="hero-block hero-mint" aria-labelledby="hero-title">
        <HeroShapes />
        <p className="hero-eyebrow">{t("planui.todayTitle")}</p>
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 animate-check-pop place-items-center rounded-full bg-ink-900/90 text-mint">
            <Check size={34} strokeWidth={3} aria-hidden />
          </span>
          <div>
            <h2 id="hero-title" className="hero-title">
              {t("home.allDone")}
            </h2>
            <p className="mt-1 text-sm font-medium opacity-80">{t("home.comeBack")}</p>
          </div>
        </div>
        {p.streak > 0 && (
          <p className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-ink-900/90 px-4 py-2 font-display font-bold text-paper">
            <Flame size={18} className="flame-live text-gold" aria-hidden />
            {p.streak} {p.streak === 1 ? t("home.streakDay") : t("home.streakDays")}
          </p>
        )}
      </section>
    );
  }

  // Todo tildado: lo próximo es cerrar el día.
  if (p.allChecked || !p.next) {
    return (
      <section className="hero-block hero-gold" aria-labelledby="hero-title">
        <HeroShapes />
        <p className="hero-eyebrow">{t("home.upNext")}</p>
        <h2 id="hero-title" className="hero-title">
          {t("home.closeTitle")}
        </h2>
        <p className="relative mt-2 max-w-sm text-sm font-medium opacity-80">{t("home.closeSub")}</p>
        <button className="hero-cta mt-6" disabled={p.completing} onClick={p.onComplete}>
          {p.completing ? (
            <>
              <BrandDots /> {t("home.saving")}
            </>
          ) : (
            <>
              {t("home.completeBtn")} <Flame size={18} aria-hidden />
            </>
          )}
        </button>
      </section>
    );
  }

  const step = p.next.key;

  if (step === "convo_done") {
    return (
      <section className="hero-block hero-coral" aria-labelledby="hero-title">
        <HeroShapes />
        <p className="hero-eyebrow">
          {t("home.upNext")} · {t("home.convoLabel")}
        </p>
        <h2 id="hero-title" className="hero-title">
          {lesson.topic ?? t("home.freeChat")}
        </h2>
        <p className="relative mt-2 max-w-sm text-sm font-medium opacity-80">{t("home.convoTodo", { n: MIN_USER_TURNS })}</p>
        <Link to="/conversation" state={{ topic: lesson.topic }} className="hero-cta mt-6">
          <MessageCircle size={18} aria-hidden /> {t("home.startTalking")} <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    );
  }

  if (step === "chunk_done") {
    const phrase = lesson.chunk?.english;
    return (
      <section className="hero-block hero-coral" aria-labelledby="hero-title">
        <HeroShapes />
        <p className="hero-eyebrow">
          {t("home.upNext")} · {t("home.chunkLabel")}
        </p>
        <h2 id="hero-title" className="hero-title">
          {phrase ? `“${phrase}”` : lesson.chunk_id ? t("home.chunkLoading") : t("home.chunkNone")}
        </h2>
        {lesson.chunk?.spanish && <p className="relative mt-1 text-sm italic opacity-80">{lesson.chunk.spanish}</p>}
        <p className="relative mt-3 text-sm font-medium opacity-80">{t("home.chunkHint")}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          {phrase && (
            <button className="hero-cta-ghost" onClick={() => p.onSpeak(phrase)}>
              <Volume2 size={18} aria-hidden /> {t("home.listen")}
            </button>
          )}
          <button
            className="hero-cta"
            onClick={() => {
              haptic(12);
              p.onToggle("chunk_done");
            }}
          >
            <Check size={18} aria-hidden /> {t("home.saidIt")}
          </button>
        </div>
      </section>
    );
  }

  // Palabra del día
  const word = lesson.word!;
  const def = p.wordDef;
  return (
    <section className="hero-block hero-sky" aria-labelledby="hero-title">
      <HeroShapes />
      <p className="hero-eyebrow">
        {t("home.upNext")} · {t("home.wordLabel")}
      </p>
      <h2 id="hero-title" className="hero-title">
        {word}
      </h2>
      {def?.phonetic && <p className="relative mt-1 font-mono text-sm opacity-80">/{def.phonetic.replace(/^\/|\/$/g, "")}/</p>}
      {def?.definition_es && <p className="relative mt-2 max-w-sm text-sm font-medium opacity-90">{def.definition_es}</p>}
      {def?.example && <p className="relative mt-1 max-w-sm text-sm italic opacity-75">“{def.example}”</p>}
      <div className="relative mt-6 flex flex-wrap gap-3">
        <button className="hero-cta-ghost" onClick={() => p.onSpeak(word)} aria-label={t("home.pronounce")}>
          <Volume2 size={18} aria-hidden /> {t("home.listen")}
        </button>
        <button
          className="hero-cta"
          onClick={() => {
            haptic(12);
            p.onToggle("word_done");
          }}
        >
          <Check size={18} aria-hidden /> {t("home.gotIt")}
        </button>
      </div>
    </section>
  );
}

/** Formas grandes de fondo: le dan carácter al bloque sin tapar el texto. */
function HeroShapes() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span className="hero-shape absolute -right-16 -top-20 h-64 w-64 rounded-full" />
      <span className="hero-shape hero-shape-2 absolute -bottom-24 right-10 h-48 w-48 rounded-[3rem]" />
    </span>
  );
}

function PathNode({
  step,
  current,
  t,
  onToggle,
}: {
  step: Step;
  current: boolean;
  t: ReturnType<typeof tFor>;
  onToggle: (item: LessonItem) => void;
}) {
  const Icon = step.icon;
  const circle = `relative grid h-12 w-12 place-items-center rounded-full transition-[background-color,border-color,color,transform] duration-300 ease-spring ${
    step.done
      ? "check-burst bg-mint text-ink-900"
      : current
      ? "bg-coral text-ink-900 shadow-[0_8px_20px_-8px_rgb(var(--coral)/0.8)]"
      : "border-2 border-ink-500 bg-ink-800 text-paper-faint"
  }`;
  const inner = (
    <>
      {current && !step.done && <span aria-hidden className="absolute inset-0 rounded-full bg-coral/40 motion-safe:animate-pulse-ring" />}
      {step.done ? <Check size={22} strokeWidth={3} className="animate-check-pop" aria-hidden /> : <Icon size={20} className="relative" aria-hidden />}
    </>
  );
  // La conversación se tilda sola; frase y palabra las marca la persona.
  const manual = step.key !== "convo_done";
  return (
    <li className="relative z-[1] flex flex-1 flex-col items-center gap-2 text-center">
      {manual ? (
        <button
          type="button"
          className={`${circle} active:scale-90`}
          aria-pressed={step.done}
          aria-label={t("home.markDone", { item: step.key === "chunk_done" ? t("home.chunkLabel") : t("home.wordLabel") })}
          onClick={() => {
            if (!step.done) haptic(10);
            onToggle(step.key);
          }}
        >
          {inner}
        </button>
      ) : (
        <span className={circle} aria-hidden>
          {inner}
        </span>
      )}
      <span className={`text-xs font-semibold ${step.done ? "text-mint" : current ? "text-paper" : "text-paper-muted"}`}>
        {step.label}
        {step.done && <span className="sr-only"> (done)</span>}
      </span>
    </li>
  );
}
