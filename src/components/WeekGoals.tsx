import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { buildPlan, loadPlanInput, type Plan as PlanData } from "../lib/plan";
import { tFor } from "../i18n";

/** La semana en un vistazo y las metas semanales (antes en "My plan"). */
export default function WeekGoals() {
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

  return (
    <section aria-labelledby="week-goals-title" className="card mb-6 p-5">
      <h2 id="week-goals-title" className="eyebrow mb-3">{t("planui.weekTitle")}</h2>
      <ol className="mb-5 grid grid-cols-7 gap-1.5" aria-label={t("planui.weekDaysAria")}>
        {plan.days.map((d) => (
          <li key={d.date} className="text-center">
            <span
              className={`mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                d.active ? "bg-mint text-ink-900" : d.isToday ? "border border-coral text-coral" : "bg-ink-700 text-paper-faint"
              }`}
              aria-label={d.active ? t("planui.practisedAria", { d: d.label }) : d.label}
            >
              {d.active ? "✓" : ""}
            </span>
            <span className={`text-[10px] ${d.isToday ? "text-coral" : "text-paper-faint"}`}>{d.label}</span>
          </li>
        ))}
      </ol>
      <ul className="space-y-3">
        {plan.goals.map((g) => {
          const pctVal = Math.min(100, Math.round((g.current / g.target) * 100));
          const met = g.current >= g.target;
          return (
            <li key={g.id}>
              <div className="flex justify-between text-sm">
                <span>{g.label}</span>
                <span className={`font-mono text-xs ${met ? "text-mint" : "text-paper-muted"}`}>
                  {Math.min(g.current, 999)}/{g.target}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 rounded-full bg-ink-600"
                role="progressbar"
                aria-label={g.label}
                aria-valuemin={0}
                aria-valuemax={g.target}
                aria-valuenow={Math.min(g.current, g.target)}
              >
                <div className={`h-1.5 rounded-full ${met ? "bg-mint" : "bg-coral"}`} style={{ width: `${pctVal}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
