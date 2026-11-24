import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { tFor } from "../i18n";

interface LevelChange {
  id: string;
  from_level: string;
  to_level: string;
  reason: string | null;
  created_at: string;
}

/**
 * Historial de cambios de nivel: muestra cuándo y por qué subió o bajó tu nivel.
 * Así el nivel no aparece "de la nada": cada cambio tiene fecha y motivo.
 */
export default function LevelHistory() {
  const { profile } = useAuth();
  const lang = profile?.learning_language === "ca" ? "ca" : "en";
  const t = tFor(lang);
  const [changes, setChanges] = useState<LevelChange[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void supabase
      .from("level_history")
      .select("id, from_level, to_level, reason, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (cancelled) return;
        setChanges(error ? [] : ((data as LevelChange[] | null) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || changes === null) return null;

  return (
    <section className="card mb-6 p-5" aria-labelledby="level-history-title">
      <h2 id="level-history-title" className="eyebrow mb-3">{t("planui.histTitle")}</h2>
      <p className="mb-4 text-sm text-paper-muted">{t("planui.histIntro")}</p>

      {changes.length === 0 ? (
        <p className="text-sm text-paper-faint">{t("planui.histNone")}</p>
      ) : (
        <ol className="space-y-3">
          {changes.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <span
                className={`mt-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                  levelRank(c.to_level) > levelRank(c.from_level) ? "bg-mint/20 text-mint" : "bg-coral/15 text-coral"
                }`}
              >
                {c.from_level} → {c.to_level}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{c.reason ?? t("planui.levelUpdated")}</span>
                <span className="block text-xs text-paper-faint">{formatDate(c.created_at, lang)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const ORDER = ["A1", "A2", "B1", "B2", "C1"];

function levelRank(level: string): number {
  return ORDER.indexOf(level);
}

function formatDate(iso: string, lang: "en" | "ca"): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(lang === "ca" ? "ca-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}
