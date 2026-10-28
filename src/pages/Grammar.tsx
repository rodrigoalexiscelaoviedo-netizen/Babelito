import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GRAMMAR_LESSONS, lessonsForError } from "../lib/grammarLessons";
import { loadGrammarScores } from "../lib/grammarProgress";
import { loadErrorRows, summarizeErrors } from "../lib/mistakes";
import { QUIZ_PASS_PERCENT } from "../lib/situations";
import { levelRank } from "../lib/storyLibrary";

export default function Grammar() {
  const { profile } = useAuth();
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
    for (const t of topTypes) for (const l of lessonsForError(t)) ids.add(l.id);
    return ids;
  }, [topTypes]);

  const lessons = useMemo(() => {
    const me = levelRank(profile?.current_level ?? "A1");
    return [...GRAMMAR_LESSONS].sort((a, b) => {
      const ra = recommended.has(a.id) ? 0 : 1;
      const rb = recommended.has(b.id) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const pa = (scores[a.id] ?? 0) >= QUIZ_PASS_PERCENT ? 1 : 0;
      const pb = (scores[b.id] ?? 0) >= QUIZ_PASS_PERCENT ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return Math.abs(levelRank(a.level) - me) - Math.abs(levelRank(b.level) - me);
    });
  }, [recommended, scores, profile?.current_level]);

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  const passed = GRAMMAR_LESSONS.filter((l) => (scores[l.id] ?? 0) >= QUIZ_PASS_PERCENT).length;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Grammar</p>
      <h1 className="page-title mb-2">Short lessons, real examples</h1>
      <p className="text-paper-muted mb-6">
        Each lesson takes about five minutes: the rule, examples, the mistakes Spanish speakers make, and a quiz.
        {passed > 0 && ` · ${passed}/${GRAMMAR_LESSONS.length} passed`}
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
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">For you</span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold mt-2">{l.title}</h3>
              <p className="text-sm text-paper-muted mt-1">{l.summary}</p>
              <p className={`mt-3 text-[11px] font-medium ${ok ? "text-mint" : "text-paper-faint"}`}>
                {ok ? (
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} /> Passed · {best}%
                  </span>
                ) : best ? (
                  `Best: ${best}% — try again`
                ) : (
                  "Not started"
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
