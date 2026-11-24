import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildPlan, loadPlanInput, type Plan as PlanData } from "../lib/plan";
import { tFor } from "../i18n";

/** Lo que hay que hacer hoy: el plan del día, en Inicio. */
export default function TodayTasks() {
  const { profile } = useAuth();
  const lang = profile?.learning_language === "ca" ? "ca" : "en";
  const t = tFor(lang);
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void loadPlanInput(profile).then((input) => {
      if (!cancelled) setPlan(buildPlan({ ...input, lang }));
    });
    return () => {
      cancelled = true;
    };
  }, [profile, lang]);

  if (!profile || !plan) return null;

  const pending = plan.tasks.filter((x) => !x.done);
  const minutesLeft = pending.reduce((a, x) => a + x.minutes, 0);

  return (
    <section aria-labelledby="today-tasks-title" className="card mb-6 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="today-tasks-title" className="font-display text-lg font-bold">
          {t("planui.todayTitle")}
        </h2>
        <p className="text-xs text-paper-muted">
          {t("planui.todayCount", { a: plan.doneToday, b: plan.tasks.length })}
          {pending.length > 0 ? t("planui.todayLeft", { n: minutesLeft }) : ""}
        </p>
      </div>
      <ul className="space-y-3">
        {plan.tasks.map((task) => (
          <li key={task.id}>
            <Link to={task.to} className={`card-interactive flex items-center gap-3 p-4 ${task.done ? "opacity-70" : ""}`}>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  task.done ? "bg-mint text-ink-900" : "border border-ink-500 text-transparent"
                }`}
                aria-hidden
              >
                <Check size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-medium ${task.done ? "line-through decoration-paper-faint" : ""}`}>{task.title}</span>
                <span className="block text-xs text-paper-muted">{task.detail}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-paper-faint">
                <Clock size={11} /> {t("planui.minutes", { n: task.minutes })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
