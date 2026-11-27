import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildLadder, loadLadderEvidence, type Ladder } from "../lib/levelLadder";
import type { Level } from "../lib/types";
import { tFor } from "../i18n";

/** Escalera A1→C1 con lo que falta para el siguiente nivel. */
export default function LevelLadder() {
  const { profile } = useAuth();
  const lang = profile?.learning_language === "ca" ? "ca" : "en";
  const t = tFor(lang);
  const [ladder, setLadder] = useState<Ladder | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const current = (profile.current_level ?? "A1") as Level;
    void loadLadderEvidence(profile.id, profile.diagnosed_level ?? null).then((ev) => {
      if (!cancelled) setLadder(buildLadder(current, ev, lang));
    });
    return () => {
      cancelled = true;
    };
  }, [profile, lang]);

  if (!profile || !ladder) return null;

  return (
    <section className="card p-5" aria-label={t("planui.ladderAria")}>
      <p className="eyebrow mb-3">{t("planui.ladderTitle")}</p>

      <ol className="mb-4 flex items-center gap-1.5">
        {ladder.rungs.map((r) => (
          <li
            key={r.level}
            className={`flex-1 rounded-lg py-2 text-center font-mono text-sm font-bold ${
              r.state === "current"
                ? "bg-coral text-ink-900"
                : r.state === "done"
                ? "bg-mint/15 text-mint"
                : "bg-ink-700 text-paper-faint"
            }`}
            aria-current={r.state === "current" ? "step" : undefined}
          >
            {r.level}
          </li>
        ))}
      </ol>

      <p className="text-sm text-paper-muted">{ladder.message}</p>

      {ladder.readiness !== null && ladder.next && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-paper-faint">
            <span>{t("planui.scoreFor", { l: ladder.next })}</span>
            <span>
              {t("planui.scoreNeeds", { r: ladder.readiness, n: ladder.needed })}
              {ladder.goals.some((g) => g.id === "sessions" && !g.met) ? t("planui.moveAfter") : ""}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-ink-600">
            <div className="bar-grow h-2 rounded-full bg-coral" style={{ width: `${ladder.readiness}%` }} />
            <span className="absolute -top-1 h-4 w-0.5 bg-paper/60" style={{ left: `${ladder.needed}%` }} aria-hidden />
          </div>
        </div>
      )}

      {ladder.goals.length > 0 && (
        <ul className="mt-5 space-y-3">
          {ladder.goals.map((g) => (
            <li key={g.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {g.met && <Check size={14} className="text-mint" />} {g.label}
                  {!g.counts && <span className="rounded-full bg-ink-700 px-1.5 py-0.5 text-[9px] font-normal text-paper-faint">{t("planui.helps")}</span>}
                </p>
                <span className={`font-mono text-xs ${g.met ? "text-mint" : "text-paper-muted"}`}>{g.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ink-600" aria-hidden>
                <div className={`bar-grow h-1.5 rounded-full ${g.met ? "bg-mint" : "bg-gold"}`} style={{ width: `${g.percent}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-paper-faint">{g.hint}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
