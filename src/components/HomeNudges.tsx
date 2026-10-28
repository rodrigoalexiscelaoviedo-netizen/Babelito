import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarCheck, MessageCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { buildPlan, loadPlanInput, type Plan } from "../lib/plan";
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
  const [plan, setPlan] = useState<Plan | null>(null);

  // Plan de hoy (qué conviene hacer ahora). Solo inglés por ahora.
  useEffect(() => {
    if (ca || !profile) return;
    let cancelled = false;
    void loadPlanInput(profile)
      .then((input) => {
        if (!cancelled) setPlan(buildPlan(input));
      })
      .catch(() => {
        /* sin plan: la tarjeta simplemente no aparece */
      });
    return () => {
      cancelled = true;
    };
  }, [ca, profile]);

  const canAskPush =
    !pushHidden && pushSupported() && typeof Notification !== "undefined" && Notification.permission === "default";

  if (!session && !canAskPush && !plan) return null;

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

      {plan && !ca && (() => {
        const next = plan.tasks.find((t) => !t.done);
        return (
          <Link to={next ? "/plan" : "/plan"} className="card-interactive flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint">
              <CalendarCheck size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {next ? `Today's plan · ${plan.doneToday}/${plan.tasks.length} done` : "Today's plan complete 🎉"}
              </span>
              <span className="block truncate text-xs text-paper-muted">
                {next ? `Next: ${next.title}` : "See your week and level progress"}
              </span>
            </span>
            <span className="text-mint">→</span>
          </Link>
        );
      })()}

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
