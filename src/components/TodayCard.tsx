import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, CheckCircle2, Clock, Flame, Volume2 } from "lucide-react";
import { activeItems, isTriadComplete, type DailyLesson, type LessonItem } from "../lib/dailyLesson";
import type { PlanTask } from "../lib/plan";
import type { WordDefinition } from "../lib/dictionary";
import { MIN_USER_TURNS } from "../lib/practice";
import { BrandDots } from "./Loader";
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
  onSpeak: (word: string) => void;
}

/**
 * Una sola lista para el día. Arriba, lo que cierra la práctica (cuenta para la
 * racha); abajo, lo recomendado si queda tiempo (se tilda solo).
 */
export default function TodayCard({
  lang,
  lesson,
  tasks,
  loading,
  error,
  itemError,
  completing,
  streak,
  freezesLeft,
  wordDef,
  onRetry,
  onToggle,
  onComplete,
  onSpeak,
}: TodayCardProps) {
  const t = tFor(lang);

  const items = lesson ? activeItems(lesson) : [];
  const doneCount = lesson ? items.filter((k) => lesson[k]).length : 0;
  const allChecked = lesson ? isTriadComplete(lesson) : false;

  const extras = tasks.filter((x) => x.id !== "talk");
  const extraMinutes = extras.filter((x) => !x.done).reduce((a, x) => a + x.minutes, 0);

  return (
    <section aria-labelledby="today-title" className="card mb-6 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id="today-title" className="font-display text-lg font-bold">
          {t("planui.todayTitle")}
        </h2>
        <div className="flex flex-col items-end gap-0.5">
          <span className="flex items-center gap-1.5 font-display font-bold text-coral">
            {streak > 0 && !lesson?.completed && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-coral motion-reduce:animate-none" title={t("home.streakAtRisk")} />
            )}
            <Flame size={16} aria-hidden />
            {streak} {streak === 1 ? t("home.streakDay") : t("home.streakDays")}
          </span>
          {freezesLeft > 0 && (
            <span className="text-[10px] text-paper-faint">
              ❄️ {freezesLeft} {freezesLeft !== 1 ? t("home.freezeWordMany") : t("home.freezeWordOne")}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <BrandDots size="md" />
        </div>
      ) : error || !lesson ? (
        <div className="py-6 text-center">
          <p className="mb-1 text-sm text-coral">{t("home.errLoad")}</p>
          {error && <p className="mb-3 text-xs text-paper-faint">{error}</p>}
          <button className="btn-coral px-4 py-2 text-sm" onClick={onRetry}>
            {t("home.tryAgain")}
          </button>
        </div>
      ) : (
        <>
          {lesson.completed ? (
            <div className="py-3 text-center">
              <CheckCircle2 size={36} className="mx-auto mb-2 animate-check-pop text-mint" aria-hidden />
              <p className="font-display font-bold text-mint">{t("home.allDone")}</p>
              <p className="mt-1 text-xs text-paper-muted">{t("home.comeBack")}</p>
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h3 className="eyebrow">{t("home.coreTitle")}</h3>
                <p className="text-xs text-paper-muted">{t("home.coreCount", { done: doneCount, total: items.length })}</p>
              </div>

              <ul className="divide-y divide-ink-600">
                {/* Conversación: se tilda sola al hablar con el coach (chat o llamada). */}
                <li>
                  <Link
                    to="/conversation"
                    state={{ topic: lesson.topic }}
                    className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-ink-600/40"
                  >
                    <StatusDot done={lesson.convo_done} />
                    <span className="min-w-0 flex-1">
                      <Label>{t("home.convoLabel")}</Label>
                      <span className="block font-medium leading-snug">{lesson.topic ?? t("home.freeChat")}</span>
                      <span className="mt-1 block text-xs text-paper-faint">
                        {lesson.convo_done ? t("home.convoDone") : t("home.convoTodo", { n: MIN_USER_TURNS })}
                      </span>
                    </span>
                  </Link>
                </li>

                {/* Frase del día: la marca la persona. */}
                <li className="flex items-start gap-3 py-3">
                  <CheckButton
                    done={lesson.chunk_done}
                    label={t("home.markDone", { item: t("home.chunkLabel") })}
                    onClick={() => onToggle("chunk_done")}
                  />
                  <div className="min-w-0 flex-1">
                    <Label>{t("home.chunkLabel")}</Label>
                    {lesson.chunk?.english ? (
                      <>
                        <p className="font-medium leading-snug">{lesson.chunk.english}</p>
                        {lesson.chunk.spanish && <p className="mt-0.5 text-xs italic text-paper-faint">{lesson.chunk.spanish}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-paper-muted">{lesson.chunk_id ? t("home.chunkLoading") : t("home.chunkNone")}</p>
                    )}
                    <p className="mt-1 text-xs text-paper-faint">{t("home.chunkHint")}</p>
                  </div>
                </li>

                {/* Palabra del día: solo cuenta si hay palabra; si no, es un atajo. */}
                <li className="flex items-start gap-3 py-3">
                  {lesson.word ? (
                    <>
                      <CheckButton
                        done={lesson.word_done}
                        label={t("home.markDone", { item: t("home.wordLabel") })}
                        onClick={() => onToggle("word_done")}
                      />
                      <div className="min-w-0 flex-1">
                        <Label>{t("home.wordLabel")}</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display font-bold">{lesson.word}</p>
                          {wordDef?.phonetic && (
                            <span className="font-mono text-xs text-paper-muted">/{wordDef.phonetic.replace(/^\/|\/$/g, "")}/</span>
                          )}
                          <button
                            className="text-paper-faint transition hover:text-coral"
                            onClick={() => onSpeak(lesson.word!)}
                            aria-label={t("home.pronounce")}
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                        {wordDef?.definition_es && <p className="mt-0.5 text-sm text-paper-muted">{wordDef.definition_es}</p>}
                        {wordDef?.example && <p className="mt-0.5 text-xs italic text-paper-faint">"{wordDef.example}"</p>}
                      </div>
                    </>
                  ) : (
                    <Link to="/reading" className="flex flex-1 items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center text-mint">
                        <BookOpen size={18} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-mint">{t("home.learnWord")}</span>
                        <span className="block text-xs text-paper-faint">{t("home.learnWordSub")}</span>
                      </span>
                    </Link>
                  )}
                </li>
              </ul>

              {itemError && <p className="mb-2 text-center text-xs text-coral" role="alert">{itemError}</p>}

              <button
                className="btn-coral mt-2 flex w-full items-center justify-center gap-2"
                disabled={!allChecked || completing}
                onClick={onComplete}
              >
                {completing ? (
                  <span className="flex items-center gap-2">
                    <BrandDots /> {t("home.saving")}
                  </span>
                ) : (
                  t("home.completeBtn")
                )}
              </button>
              {!allChecked && !lesson.word && <p className="mt-2 text-center text-xs text-paper-faint">{t("home.wordNotCounted")}</p>}
            </div>
          )}

          {extras.length > 0 && (
            <div className="mt-5 border-t border-ink-600 pt-4">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h3 className="eyebrow">{t("home.extrasTitle")}</h3>
                {extraMinutes > 0 && <p className="text-xs text-paper-muted">{t("home.extrasMinutes", { n: extraMinutes })}</p>}
              </div>
              <ul>
                {extras.map((task) => (
                  <li key={task.id}>
                    <Link to={task.to} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-ink-600/40">
                      <StatusDot done={task.done} />
                      <span className="min-w-0 flex-1">
                        <span className={`block font-medium ${task.done ? "text-paper-muted line-through" : ""}`}>{task.title}</span>
                        <span className="block text-xs text-paper-muted">{task.detail}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-paper-faint">
                        <Clock size={11} aria-hidden /> {t("planui.minutes", { n: task.minutes })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-0.5 block font-mono text-xs uppercase tracking-widest text-paper-muted">{children}</span>;
}

const dotClass = (done: boolean) =>
  `grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-mint text-ink-900" : "border-2 border-paper-faint/60 text-transparent"}`;

/** Estado de una tarea que se tilda sola. */
function StatusDot({ done }: { done: boolean }) {
  return (
    <span className={dotClass(done)} aria-hidden>
      <Check size={16} />
    </span>
  );
}

/** Tilde que marca la persona. */
function CheckButton({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={done} aria-label={label} className={`${dotClass(done)} transition ${done ? "" : "hover:border-mint hover:text-mint"}`}>
      <Check size={16} />
    </button>
  );
}
