import { BRAND } from "../lib/theme";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getTotalXp,
  getXpToday,
  getRecentXp,
  levelFromXp,
  levelTitle,
  SOURCE_LABEL,
  type XpEvent,
} from "../lib/xp";

/**
 * Nivel, progreso y XP de hoy. Se muestra en la versión en inglés; la versión
 * catalana se agrega cuando se replique el contenido.
 *
 * compact: solo la barra (para Inicio). Sin compact: añade el historial reciente.
 */
export default function XpCard({ compact = false }: { compact?: boolean }) {
  const { profile } = useAuth();
  const [total, setTotal] = useState<number | null>(null);
  const [today, setToday] = useState(0);
  const [recent, setRecent] = useState<XpEvent[]>([]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    Promise.all([
      getTotalXp(profile.id),
      getXpToday(profile.id),
      compact ? Promise.resolve([] as XpEvent[]) : getRecentXp(profile.id),
    ])
      .then(([t, d, r]) => {
        if (cancelled) return;
        setTotal(t);
        setToday(d);
        setRecent(r);
      })
      .catch(() => {
        if (!cancelled) setTotal(0);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, compact]);

  // Celebración de subida de nivel: compara con el último nivel visto en este dispositivo.
  const [levelUp, setLevelUp] = useState<number | null>(null);
  useEffect(() => {
    if (total === null || !profile) return;
    const level = levelFromXp(total).level;
    const key = `babelito:lastLevel:${profile.id}`;
    let previous: number | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      previous = raw ? Number(raw) : null;
      window.localStorage.setItem(key, String(level));
    } catch {
      return; // sin almacenamiento local: sin celebración, sin error
    }
    if (previous !== null && level > previous) {
      setLevelUp(level);
      const t = window.setTimeout(() => setLevelUp(null), 3200);
      return () => window.clearTimeout(t);
    }
  }, [total, profile?.id]);

  if (!profile || profile.learning_language === "ca") return null;

  if (total === null) {
    return (
      <div className="card p-5" aria-busy="true" aria-label="Loading your level">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-5 w-28" />
          </div>
          <div className="skeleton h-7 w-14" />
        </div>
        <div className="skeleton h-2.5 w-full rounded-full" />
      </div>
    );
  }

  const info = levelFromXp(total);

  return (
    <div className={`card p-5 relative overflow-hidden ${levelUp || today > 0 ? "glow-gold" : ""}`}>
      {levelUp && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-800/90 backdrop-blur-sm"
          role="status"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="confetti-piece absolute top-0 h-2 w-1.5 rounded-sm"
              style={{
                left: `${6 + i * 6.5}%`,
                background: [BRAND.coral, BRAND.mint, BRAND.gold][i % 3],
                animationDelay: `${(i % 5) * 0.12}s`,
              }}
            />
          ))}
          <p className="eyebrow text-gold level-up-pop">Level up!</p>
          <p className="font-display text-3xl font-extrabold level-up-pop">Level {levelUp}</p>
          <p className="text-sm text-paper-muted mt-1">{levelTitle(levelUp)}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="eyebrow mb-1">Level {info.level}</p>
          <p className="font-display text-xl font-extrabold">{info.title}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold text-gold">{total}</p>
          <p className="text-[11px] text-paper-faint uppercase tracking-widest font-mono">XP</p>
        </div>
      </div>

      <div
        className="h-2.5 rounded-full bg-ink-700 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(info.progress * 100)}
        aria-label={`Progress to level ${info.level + 1}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral to-gold transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(info.progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-paper-muted">
        <span>{info.toNext} XP to level {info.level + 1}</span>
        {today > 0 && (
          <span className="inline-flex items-center gap-1 text-mint">
            <Sparkles size={12} /> +{today} today
          </span>
        )}
      </div>

      {!compact && recent.length > 0 && (
        <div className="mt-5 pt-4 border-t border-ink-600">
          <p className="eyebrow mb-3">Recent activity</p>
          <ul className="space-y-2">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-paper-muted">{SOURCE_LABEL[e.source]}</span>
                <span className="font-mono text-mint">+{e.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
