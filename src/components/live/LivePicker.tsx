import { useState, type CSSProperties } from "react";
import { MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { SITUATION_ICONS } from "../situationIcons";
import { goalsFor } from "../../lib/liveGoals";
import type { Situation } from "../../lib/situationsData";
import type { LivePrefs } from "../../lib/liveHelp";
import type { tFor } from "../../i18n";

const STYLES: Array<{ id: LivePrefs["correction"]; label: string; text: string }> = [
  { id: "gentle", label: "After the call", text: "No interruptions. You review everything at the end." },
  { id: "balanced", label: "Balanced", text: "A quick tip only when it matters or repeats." },
  { id: "strict", label: "Every mistake", text: "A quick tip each time, one per turn." },
];

/** Antes de llamar: cómo corregir, qué recuerda el coach y qué tipo de llamada. */
export default function LivePicker({
  t,
  english,
  topic,
  bank,
  correction,
  onCorrection,
  memory,
  onForget,
  onFree,
  onSurprise,
  onSituation,
  onClose,
}: {
  t: ReturnType<typeof tFor>;
  english: boolean;
  topic: string | null;
  bank: Situation[];
  correction: LivePrefs["correction"];
  onCorrection: (c: LivePrefs["correction"]) => void;
  memory: string[];
  onForget: () => void;
  onFree: () => void;
  onSurprise: () => void;
  onSituation: (s: Situation) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink-900 p-4 sm:p-6" role="dialog" aria-label={t("live.chooseAria")}>
      <div className="mx-auto w-full max-w-2xl animate-fade-up pb-8">
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden />
            {t("live.beta")}
          </p>
          <button onClick={onClose} className="inline-flex items-center gap-1 py-2 text-xs text-paper-muted hover:text-coral" aria-label={t("live.close")}>
            <X size={14} aria-hidden /> {t("live.cancel")}
          </button>
        </div>
        <h2 className="page-title mb-1 mt-2">{t("live.pickTitle")}</h2>
        <p className="mb-5 text-sm text-paper-muted">{t("live.pickSub")}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onFree}
            className="flex items-start gap-3 rounded-2xl bg-coral p-5 text-left text-ink-900 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/40"
          >
            <MessageCircle size={22} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <span className="block font-display text-lg font-bold">{t("live.freeTitle")}</span>
              <span className="mt-0.5 block text-sm">{topic ?? t("live.freeText")}</span>
            </span>
          </button>
          <button onClick={onSurprise} className="card-interactive flex items-start gap-3 p-5 text-left">
            <Sparkles size={22} className="mt-0.5 shrink-0 text-gold" aria-hidden />
            <span>
              <span className="block font-display text-lg font-bold">{t("live.surpriseTitle")}</span>
              <span className="mt-0.5 block text-sm text-paper-muted">{t("live.surpriseText")}</span>
            </span>
          </button>
        </div>

        {english && (
          <fieldset className="mt-6">
            <legend className="eyebrow mb-2">Corrections while you talk</legend>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-xl border px-2 py-2 text-center text-xs font-semibold transition focus-within:ring-2 focus-within:ring-mint ${
                    correction === s.id ? "border-mint bg-mint/15 text-mint" : "border-ink-600 bg-ink-800 text-paper"
                  }`}
                >
                  <input type="radio" name="live-correction" value={s.id} checked={correction === s.id} onChange={() => onCorrection(s.id)} className="sr-only" />
                  {s.label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-paper-muted">{STYLES.find((s) => s.id === correction)?.text}</p>
          </fieldset>
        )}

        {english && memory.length > 0 && (
          <details className="mt-5 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">What your coach remembers ({memory.length})</summary>
            <p className="mt-2 text-xs text-paper-muted">From your free chats. It uses them to pick up where you left off.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {memory.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (confirming) onForget();
                setConfirming(!confirming);
              }}
              className="mt-3 text-xs text-coral underline-offset-2 hover:underline"
            >
              {confirming ? "Tap again to erase it all" : "Forget everything"}
            </button>
          </details>
        )}

        <p className="eyebrow mb-3 mt-8">{t("live.realCalls")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bank.map((s) => {
            const Icon = SITUATION_ICONS[s.icon] ?? Phone;
            const goals = english ? goalsFor(s.id).length : 0;
            return (
              <button
                key={s.id}
                onClick={() => onSituation(s)}
                className="hub-card group flex items-start gap-3 p-4 text-left"
                style={{ ["--accent-rgb" as string]: "var(--coral)" } as CSSProperties}
              >
                <span className="hub-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[rgb(var(--accent-rgb))]">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold">{s.title}</span>
                    <span className="rounded bg-ink-600 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper-muted">{s.level}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-paper-muted">{s.blurb}</span>
                  {goals > 0 && <span className="mt-1 block text-[11px] text-paper-faint">{goals} goals</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
