import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GRAMMAR_LESSONS, lessonsForError } from "../lib/grammarLessons";
import { GRAMMAR_LESSONS_CA, lessonsForErrorCa } from "../lib/grammarLessonsCa";
import { loadGrammarScores } from "../lib/grammarProgress";
import { loadErrorRows, summarizeErrors } from "../lib/mistakes";
import { QUIZ_PASS_PERCENT } from "../lib/situations";
import { levelRank } from "../lib/storyLibrary";
import { tFor } from "../i18n";

export default function Grammar() {
  const { profile } = useAuth();
  const t = tFor(profile?.learning_language || "en");
  const isCa = profile?.learning_language === "ca";
  const LESSONS = isCa ? GRAMMAR_LESSONS_CA : GRAMMAR_LESSONS;
  const lessonsFor = isCa ? lessonsForErrorCa : lessonsForError;
  const [scores, setScores] = useState<Record<string, number>>({});
  const [topTypes, setTopTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void Promise.all([loadGrammarScores(profile.id), loadErrorRows(profile.id)]).then(([s, rows]) => {
      if (cancelled) return;
      setScores(s);
      setTopTypes(summarizeErrors(rows).stats.slice(0, 3).map((x) => x.type));
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const recommended = useMemo(() => {
    const ids = new Set<string>();
    for (const et of topTypes) for (const l of lessonsFor(et)) ids.add(l.id);
    return ids;
    // lessonsFor depende solo del idioma, que ya cambia la lista de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTypes, isCa]);

  const lessons = useMemo(() => {
    const me = levelRank(profile?.current_level ?? "A1");
    return [...LESSONS].sort((a, b) => {
      const ra = recommended.has(a.id) ? 0 : 1;
      const rb = recommended.has(b.id) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const pa = (scores[a.id] ?? 0) >= QUIZ_PASS_PERCENT ? 1 : 0;
      const pb = (scores[b.id] ?? 0) >= QUIZ_PASS_PERCENT ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return Math.abs(levelRank(a.level) - me) - Math.abs(levelRank(b.level) - me);
    });
  }, [recommended, scores, profile?.current_level, LESSONS]);

  const passed = LESSONS.filter((l) => (scores[l.id] ?? 0) >= QUIZ_PASS_PERCENT).length;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{t("grammar.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("grammar.title")}</h1>
      <p className="text-paper-muted mb-6">
        {t("grammar.intro")}
        {passed > 0 && t("grammar.passedCount", { a: passed, b: LESSONS.length })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 stagger">
        {lessons.map((l) => {
          const best = scores[l.id];
          const ok = (best ?? 0) >= QUIZ_PASS_PERCENT;
          return (
            <Link key={l.id} to={`/grammar/${l.id}`} className="card-interactive p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">{l.level}</span>
                {recommended.has(l.id) && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">{t("grammar.forYou")}</span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold mt-2">{l.title}</h3>
              <p className="text-sm text-paper-muted mt-1">{l.summary}</p>
              <p className={`mt-3 text-[11px] font-medium ${ok ? "text-mint" : "text-paper-faint"}`}>
                {ok ? (
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} /> {t("grammar.passed", { n: best })}
                  </span>
                ) : best ? (
                  t("grammar.bestTry", { n: best })
                ) : (
                  t("grammar.notStarted")
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
