import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { conversationScore } from "../lib/leveling";
import { accuracyOf, estimateSkill, loadSkillAttempts, MIN_SKILL_ATTEMPTS, SKILL_WINDOW_DAYS, type SkillEstimate } from "../lib/skillLevels";
import type { Level } from "../lib/types";

const LABEL: Record<SkillEstimate["skill"], string> = {
  reading: "Reading",
  listening: "Listening",
  conversation: "Conversation",
};

/** Nivel de cada habilidad (lectura, escucha, conversación) con su evidencia reciente. */
export default function SkillLevels() {
  const { profile } = useAuth();
  const [estimates, setEstimates] = useState<SkillEstimate[] | null>(null);

  useEffect(() => {
    if (!profile || profile.learning_language === "ca") return;
    let cancelled = false;
    const since = new Date(Date.now() - SKILL_WINDOW_DAYS * 86_400_000).toISOString();
    const general = (profile.current_level ?? "A1") as Level;
    const diagnosed = (profile.diagnosed_level as Level | null) ?? null;

    void Promise.all([
      loadSkillAttempts(profile.id),
      supabase
        .from("sessions")
        .select("id")
        .eq("user_id", profile.id)
        .in("session_type", ["conversation", "roleplay"])
        .eq("completed", true)
        .gte("created_at", since),
      supabase.from("errors").select("id").eq("user_id", profile.id).gte("created_at", since),
    ]).then(([attempts, sessionsRes, errorsRes]) => {
      if (cancelled) return;
      const sessions = (sessionsRes.data as unknown[] | null)?.length ?? 0;
      const errors = (errorsRes.data as unknown[] | null)?.length ?? 0;

      const reading = attempts.filter((a) => a.skill === "reading");
      const listening = attempts.filter((a) => a.skill === "listening");

      setEstimates([
        estimateSkill({ skill: "reading", general, diagnosed, attempts: reading.length, accuracy: accuracyOf(reading) }),
        estimateSkill({ skill: "listening", general, diagnosed, attempts: listening.length, accuracy: accuracyOf(listening) }),
        estimateSkill({
          skill: "conversation",
          general,
          diagnosed,
          attempts: sessions,
          accuracy: conversationScore(errors, sessions),
        }),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || profile.learning_language === "ca" || !estimates) return null;

  return (
    <section aria-labelledby="skills-title" className="card mb-6 p-5">
      <h2 id="skills-title" className="eyebrow mb-1">Level by skill</h2>
      <p className="mb-4 text-xs text-paper-muted">
        Last {SKILL_WINDOW_DAYS} days. A skill needs at least {MIN_SKILL_ATTEMPTS} attempts before it shows a level.
      </p>
      <ul className="space-y-4">
        {estimates.map((e) => (
          <li key={e.skill}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{LABEL[e.skill]}</span>
              {e.level ? (
                <span className="flex items-center gap-2">
                  <span className="rounded bg-ink-600 px-2 py-0.5 font-mono text-xs font-bold">{e.level}</span>
                  <StepBadge step={e.step} />
                </span>
              ) : (
                <span className="text-xs text-paper-faint">
                  {MIN_SKILL_ATTEMPTS - e.attempts > 0 ? `${MIN_SKILL_ATTEMPTS - e.attempts} more to see your level` : "no data yet"}
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden>
              <div
                className="h-1.5 rounded-full bg-mint transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round(((e.accuracy ?? 0) * 100)))}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-paper-faint">
              {e.accuracy === null ? "—" : `${Math.round(e.accuracy * 100)}% · ${e.attempts} attempt${e.attempts === 1 ? "" : "s"}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StepBadge({ step }: { step: number }) {
  if (step > 0) return <span className="text-xs font-semibold text-mint" aria-label="above your overall level">↑ above</span>;
  if (step < 0) return <span className="text-xs font-semibold text-coral" aria-label="below your overall level">↓ below</span>;
  return <span className="text-xs text-paper-faint" aria-label="same as your overall level">= overall</span>;
}
