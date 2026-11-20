import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { MIN_USER_TURNS } from "../../lib/practice";
import { SuggestedChunks, XpEarned } from "../ReportExtras";
import type { SessionReport } from "../../lib/sessionReport";

export default function ReportPanel({
  report,
  onClose,
  counted = true,
  error = "",
  learningLanguage = "en",
  xpEarned = null,
  userId,
}: {
  report: SessionReport;
  onClose: () => void;
  counted?: boolean;
  error?: string;
  learningLanguage?: string;
  xpEarned?: number | null;
  userId?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">
            {learningLanguage === "ca" ? "Informe de sessió" : "Session report"}
          </p>
          <h1 className="font-display text-2xl font-extrabold">
            {learningLanguage === "ca" ? "Com va anar" : "How it went"}
          </h1>
          <div className="mt-2"><XpEarned amount={xpEarned} learningLanguage={learningLanguage} /></div>
        </div>
        <button onClick={onClose} aria-label={t("common.close")} className="text-paper-muted hover:text-paper">
          <X size={20} />
        </button>
      </div>

      {!counted && (
        <div className="card p-4 mb-4 border-gold/40">
          <p className="text-sm text-gold font-medium mb-1">
            {learningLanguage === "ca" ? "Aquesta sessió no s'ha registrat" : "Esta sesión no se registró"}
          </p>
          <p className="text-xs text-paper-muted">
            {learningLanguage === "ca"
              ? `Va ser molt curta: calen almenys ${MIN_USER_TURNS} intercanvis teus perquè compti en la teva racha. El informe de sota segueix sent vàlid.`
              : `Too short: you need at least ${MIN_USER_TURNS} exchanges for it to count towards your streak. The report below is still valid.`}
          </p>
        </div>
      )}
      {error && (
        <div className="card p-4 mb-4 border-coral/40">
          <p className="text-sm text-coral">{error}</p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <p className="text-paper leading-relaxed">{report.summary}</p>
      </div>

      {report.did_well.length > 0 && (
        <div className="card p-5 mb-4 border-mint/20">
          <p className="eyebrow text-mint mb-3">
            {learningLanguage === "ca" ? "El que has fet bé" : "What you did well"}
          </p>
          <ul className="space-y-1.5">
            {report.did_well.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-mint mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.key_errors.length > 0 && (
        <div className="card p-5 mb-4 border-coral/20">
          <p className="eyebrow text-coral mb-3">
            {learningLanguage === "ca" ? "Errors clau" : "Key errors"}
          </p>
          <div className="space-y-3">
            {report.key_errors.map((e, i) => (
              <div key={i} className="text-sm">
                <p className="text-coral line-through">{e.error}</p>
                <p className="text-mint">→ {e.correction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <SuggestedChunks
        chunks={report.suggested_chunks}
        userId={userId}
        learningLanguage={learningLanguage}
        title={learningLanguage === "ca" ? "Expressions que podries usar la pròxima vegada" : "Chunks you could use next time"}
      />

      <p className="text-xs text-paper-faint text-center mb-4">
        Written by your AI coach
      </p>
      <button className="btn-coral w-full" onClick={onClose}>
        {learningLanguage === "ca" ? "Torna a la conversa" : "Back to conversation"}
      </button>
    </div>
  );
}
