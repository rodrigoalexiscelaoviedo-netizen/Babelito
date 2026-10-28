import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Check, Target } from "lucide-react";
import { SITUATION_ICONS } from "../components/situationIcons";
import { useAuth } from "../context/AuthContext";
import {
  SITUATIONS,
  STEP_ORDER,
  isComplete,
  loadProgress,
  sortSituations,
  stepsCount,
  type SituationProgress,
} from "../lib/situations";

const LEVEL_FILTERS = ["All", "A1", "A2", "B1", "B2"] as const;

export default function Situations() {
  const { profile } = useAuth();
  const [progress, setProgress] = useState<Record<string, SituationProgress>>({});
  const [level, setLevel] = useState<(typeof LEVEL_FILTERS)[number]>("All");

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void loadProgress(profile.id).then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const list = useMemo(() => {
    const sorted = sortSituations(SITUATIONS, profile?.current_level, progress);
    return level === "All" ? sorted : sorted.filter((s) => s.level === level);
  }, [profile?.current_level, progress, level]);

  const doneCount = SITUATIONS.filter((s) => isComplete(progress[s.id]?.steps)).length;

  // Versión catalana pendiente: se vuelve a Inicio.
  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Situations</p>
      <h1 className="page-title mb-2">Train for real life</h1>
      <p className="text-paper-muted mb-6">
        Pick a situation and work on it from every angle: key phrases, a model dialogue, a quiz and a live roleplay with your coach.
        {doneCount > 0 && ` · ${doneCount}/${SITUATIONS.length} completed`}
      </p>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by level">
        {LEVEL_FILTERS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              level === l ? "bg-coral text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 stagger">
        {list.map((s) => {
          const Icon = SITUATION_ICONS[s.icon] ?? Target;
          const steps = progress[s.id]?.steps;
          const n = stepsCount(steps);
          const done = isComplete(steps);
          return (
            <Link key={s.id} to={`/situations/${s.id}`} className="card-interactive p-5 group">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/15 text-coral">
                  <Icon size={20} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">{s.level}</span>
              </div>
              <h3 className="font-display text-lg font-bold mt-3">{s.title}</h3>
              <p className="text-sm text-paper-muted mt-1">{s.blurb}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {STEP_ORDER.map((_, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-mint" : "bg-ink-600"}`} />
                  ))}
                </div>
                <span className={`text-[11px] font-medium ${done ? "text-mint" : "text-paper-faint"}`}>
                  {done ? (
                    <span className="inline-flex items-center gap-1">
                      <Check size={12} /> Done
                    </span>
                  ) : n > 0 ? (
                    `${n}/4`
                  ) : (
                    "Start"
                  )}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
