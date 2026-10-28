import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Check, Clock, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LevelLadder from "../components/LevelLadder";
import { buildPlan, loadPlanInput, type Plan as PlanData } from "../lib/plan";

export default function Plan() {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void loadPlanInput(profile).then((input) => {
      if (!cancelled) setPlan(buildPlan(input));
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  if (!plan) {
    return (
      <div className="flex justify-center py-20 text-paper-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const minutesLeft = plan.tasks.filter((t) => !t.done).reduce((a, t) => a + t.minutes, 0);

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <p className="eyebrow mb-2">Your plan</p>
      <h1 className="page-title mb-1">Today and this week</h1>
      <p className="mb-6 text-paper-muted">
        {plan.doneToday === plan.tasks.length
          ? "You finished today's plan. Great work!"
          : `${plan.doneToday} of ${plan.tasks.length} done today · about ${minutesLeft} min left`}
      </p>

      <section aria-label="Today" className="mb-8">
        <ul className="space-y-3">
          {plan.tasks.map((t) => (
            <li key={t.id}>
              <Link
                to={t.to}
                className={`card-interactive flex items-center gap-3 p-4 ${t.done ? "opacity-70" : ""}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    t.done ? "bg-mint text-ink-900" : "border border-ink-500 text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-medium ${t.done ? "line-through decoration-paper-faint" : ""}`}>{t.title}</span>
                  <span className="block text-xs text-paper-muted">{t.detail}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-paper-faint">
                  <Clock size={11} /> {t.minutes} min
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="This week" className="card mb-6 p-5">
        <p className="eyebrow mb-3">This week</p>
        <ol className="mb-5 grid grid-cols-7 gap-1.5">
          {plan.days.map((d) => (
            <li key={d.date} className="text-center">
              <span
                className={`mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  d.active ? "bg-mint text-ink-900" : d.isToday ? "border border-coral text-coral" : "bg-ink-700 text-paper-faint"
                }`}
              >
                {d.active ? <Check size={14} /> : ""}
              </span>
              <span className={`text-[10px] ${d.isToday ? "text-coral" : "text-paper-faint"}`}>{d.label}</span>
            </li>
          ))}
        </ol>
        <ul className="space-y-3">
          {plan.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            const met = g.current >= g.target;
            return (
              <li key={g.id}>
                <div className="flex justify-between text-sm">
                  <span>{g.label}</span>
                  <span className={`font-mono text-xs ${met ? "text-mint" : "text-paper-muted"}`}>
                    {Math.min(g.current, 999)}/{g.target}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-600" aria-hidden>
                  <div className={`h-1.5 rounded-full ${met ? "bg-mint" : "bg-coral"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <LevelLadder />
    </div>
  );
}
