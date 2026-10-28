import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, MessageCircle, Target, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SITUATIONS, loadProgress, sortSituations, stepsCount, type Situation, type SituationProgress } from "../lib/situations";
import { useResumableSession } from "../lib/useResumableSession";
import { pushSupported } from "../lib/notifications";

const PUSH_DISMISSED_KEY = "babelito:nudge:push-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(PUSH_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Invitaciones breves en Inicio, solo cuando sirven:
 *  - Seguir una conversación que quedó a medias.
 *  - Activar el recordatorio diario (si el navegador lo permite y no se decidió aún).
 */
export default function HomeNudges({ userId, language }: { userId: string; language: string }) {
  const ca = language === "ca";
  const { session } = useResumableSession(userId);
  const [pushHidden, setPushHidden] = useState(readDismissed);
  const { profile } = useAuth();
  const [mission, setMission] = useState<{ pack: Situation; done: number } | null>(null);

  // Misión de Situaciones: la que está a medias, o una sugerida a tu nivel. Solo inglés por ahora.
  useEffect(() => {
    if (ca) return;
    let cancelled = false;
    void loadProgress(userId).then((progress: Record<string, SituationProgress>) => {
      if (cancelled) return;
      const started = SITUATIONS.filter((s) => {
        const n = stepsCount(progress[s.id]?.steps);
        return n > 0 && n < 4;
      }).sort((a, b) => (progress[b.id]?.updated_at ?? "").localeCompare(progress[a.id]?.updated_at ?? ""));
      const pack = started[0] ?? sortSituations(SITUATIONS, profile?.current_level, progress)[0];
      if (pack) setMission({ pack, done: stepsCount(progress[pack.id]?.steps) });
    });
    return () => {
      cancelled = true;
    };
  }, [ca, userId, profile?.current_level]);

  const canAskPush =
    !pushHidden && pushSupported() && typeof Notification !== "undefined" && Notification.permission === "default";

  if (!session && !canAskPush && !mission) return null;

  function hidePush() {
    try {
      window.localStorage.setItem(PUSH_DISMISSED_KEY, "1");
    } catch {
      /* sin almacenamiento: solo se oculta en esta sesión */
    }
    setPushHidden(true);
  }

  return (
    <div className="mb-6 space-y-3">
      {session && (
        <Link
          to="/conversation"
          state={{ resume: true }}
          className="card-interactive flex items-center gap-3 p-4"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-coral/15 text-coral">
            <MessageCircle size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {ca ? "Continua la teva conversa" : "Continue your conversation"}
            </span>
            <span className="block truncate text-xs text-paper-muted">
              {session.topic ? `${session.topic} · ` : ""}
              {session.messages.length} {ca ? "missatges desats" : "messages saved"}
            </span>
          </span>
          <span className="text-coral">→</span>
        </Link>
      )}

      {mission && !ca && (
        <Link to={`/situations/${mission.pack.id}`} className="card-interactive flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint">
            <Target size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {mission.done > 0 ? "Continue your mission" : "Try a situation"}: {mission.pack.title}
            </span>
            <span className="block truncate text-xs text-paper-muted">
              {mission.done > 0 ? `${mission.done}/4 steps done` : mission.pack.blurb}
            </span>
          </span>
          <span className="text-mint">→</span>
        </Link>
      )}

      {canAskPush && (
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <Bell size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {ca ? "Vols un recordatori diari?" : "Want a daily reminder?"}
            </span>
            <span className="block text-xs text-paper-muted">
              {ca
                ? "Cinc minuts al dia mantenen viva la teva ratxa."
                : "Five minutes a day keeps your streak alive."}
            </span>
          </span>
          <Link to="/profile" className="btn-coral px-3 py-1.5 text-sm">
            {ca ? "Activa'l" : "Turn on"}
          </Link>
          <button
            onClick={hidePush}
            className="text-paper-faint transition hover:text-paper"
            aria-label={ca ? "Ara no" : "Not now"}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
