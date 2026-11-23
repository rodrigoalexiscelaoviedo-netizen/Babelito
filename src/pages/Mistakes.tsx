import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MultipleChoiceQuiz from "../components/MultipleChoiceQuiz";
import { ERROR_TYPES, errorHint, errorLabel } from "../lib/errorTypes";
import { lessonsForError } from "../lib/grammarLessons";
import { generateDrill, loadErrorRows, summarizeErrors, type ExerciseItem, type MistakeSummary, type Trend } from "../lib/mistakes";
import { tFor } from "../i18n";

const TREND_KEY: Record<Trend, string> = {
  up: "mistakes.trendUp",
  down: "mistakes.trendDown",
  same: "mistakes.trendSame",
  new: "mistakes.trendNew",
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "down") return <ArrowDown size={12} className="text-mint" />;
  if (trend === "up") return <ArrowUp size={12} className="text-coral" />;
  return <ArrowRight size={12} className="text-paper-faint" />;
}

export default function Mistakes() {
  const { profile } = useAuth();
  const t = tFor(profile?.learning_language || "en");
  const [summary, setSummary] = useState<MistakeSummary | null>(null);
  const [drill, setDrill] = useState<{ type: string; items: ExerciseItem[]; fromAi: boolean; round: number } | null>(null);
  const [loadingDrill, setLoadingDrill] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void loadErrorRows(profile.id).then((rows) => {
      if (!cancelled) setSummary(summarizeErrors(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  async function startDrill(type: string) {
    if (!profile) return;
    setLoadingDrill(type);
    const res = await generateDrill(type, profile.current_level ?? "A2");
    setLoadingDrill(null);
    setDrill({ type, items: res.items, fromAi: res.fromAi, round: (drill?.round ?? 0) + 1 });
  }

  // Las etiquetas de errores y los ejercicios de gramática siguen en inglés: en catalán no hay contenido todavía.
  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  if (!summary) {
    return (
      <div className="flex justify-center py-20 text-paper-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const top = summary.stats[0];
  const max = Math.max(1, ...summary.stats.map((s) => s.count));

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <p className="eyebrow mb-2">{t("mistakes.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("mistakes.title")}</h1>

      {!top ? (
        <div className="card p-6 text-center">
          <p className="font-medium">{t("mistakes.nothingTitle")}</p>
          <p className="mt-1 text-sm text-paper-muted">{t("mistakes.nothingSub")}</p>
          <Link to="/conversation" className="btn-coral mt-4 inline-block">
            {t("mistakes.startTalking")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-paper-muted">
            {t("mistakes.summary", { n: summary.total, type: errorLabel(top.type) })}
          </p>

          <ul className="space-y-4">
            {summary.stats.slice(0, 5).map((s) => {
              const lessons = lessonsForError(s.type);
              return (
                <li key={s.type} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold">{errorLabel(s.type)}</h2>
                    <span className="font-mono text-sm text-paper-muted">{s.count}×</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-ink-600" aria-hidden>
                    <div className="h-1.5 rounded-full bg-coral" style={{ width: `${(s.count / max) * 100}%` }} />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-faint">
                    <TrendIcon trend={s.trend} /> {t(TREND_KEY[s.trend])}
                  </p>
                  {ERROR_TYPES[s.type] && <p className="mt-2 text-sm text-paper-muted">{errorHint(s.type)}</p>}

                  {s.examples.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {s.examples.map((e, i) => (
                        <li key={i} className="rounded-lg bg-ink-800 p-3 text-sm">
                          <p className="text-coral line-through decoration-coral/60">{e.original_text}</p>
                          <p className="text-mint">{e.correction}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-coral flex items-center gap-1.5 px-4 py-2 text-sm" onClick={() => startDrill(s.type)} disabled={loadingDrill !== null}>
                      {loadingDrill === s.type ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {t("mistakes.practise")}
                    </button>
                    {lessons[0] && (
                      <Link to={`/grammar/${lessons[0].id}`} className="btn-ghost px-4 py-2 text-sm">
                        {t("mistakes.readLesson")}
                      </Link>
                    )}
                  </div>

                  {drill?.type === s.type && (
                    <div className="mt-5 border-t border-ink-600 pt-4">
                      <p className="mb-3 text-xs text-paper-faint">
                        {drill.fromAi ? t("mistakes.fromAi") : t("mistakes.fromLesson")}
                      </p>
                      <MultipleChoiceQuiz key={drill.round} items={drill.items} onFinish={() => {}} onRetry={() => startDrill(s.type)} retryLabel={t("mistakes.newExercises")} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {summary.pronunciationWords.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-lg font-bold">{t("mistakes.pronWords")}</h2>
          <div className="flex flex-wrap gap-2">
            {summary.pronunciationWords.map((w) => (
              <span key={w} className="rounded-full bg-ink-700 px-3 py-1 text-sm">
                {w}
              </span>
            ))}
          </div>
          <Link to="/sounds" className="mt-3 inline-block text-sm text-coral hover:underline">
            {t("mistakes.practiseSounds")}
          </Link>
        </section>
      )}
    </div>
  );
}
