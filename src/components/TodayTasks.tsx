import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildPlan, loadPlanInput, type Plan as PlanData } from "../lib/plan";

/** Lo que hay que hacer hoy: el plan del día, en Inicio. */
export default function TodayTasks() {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    if (!profile || profile.learning_language === "ca") return;
    let cancelled = false;
    void loadPlanInput(profile).then((input) => {
      if (!cancelled) setPlan(buildPlan(input));
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || profile.learning_language === "ca" || !plan) return null;

  const pending = plan.tasks.filter((t) => !t.done);
  const minutesLeft = pending.reduce((a, t) => a + t.minutes, 0);

  return (
    <section aria-labelledby="today-tasks-title" className="card mb-6 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="today-tasks-title" className="font-display text-lg font-bold">
          Today&apos;s plan
        </h2>
        <p className="text-xs text-paper-muted">
          {plan.doneToday} of {plan.tasks.length} done
          {pending.length > 0 ? ` · about ${minutesLeft} min left` : ""}
        </p>
      </div>
      <ul className="space-y-3">
        {plan.tasks.map((t) => (
          <li key={t.id}>
            <Link to={t.to} className={`card-interactive flex items-center gap-3 p-4 ${t.done ? "opacity-70" : ""}`}>
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
  );
}
