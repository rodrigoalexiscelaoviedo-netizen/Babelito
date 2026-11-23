import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { sectionText } from "../lib/correctionText";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach } from "../lib/claude";
import { buildCorrectionPrompt, parseErrors } from "../lib/buildSystemPrompt";
import { tFor } from "../i18n";

export default function Correction() {
  const { profile } = useAuth();
  const learningLanguage = profile?.learning_language || "en";
  const t = tFor(learningLanguage);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  async function correct() {
    if (!text.trim() || !profile) return;
    setBusy(true);
    setResult(null);
    try {
      const raw = await askCoach({
        system: buildCorrectionPrompt(profile, profile?.learning_language || "en"),
        messages: [{ role: "user", content: text.trim() }],
        maxTokens: 1024,
      });
      const { clean, errorTypes } = parseErrors(raw);
      setResult(clean);

      // registramos la sesión + errores para que alimenten el progreso
      const { data: s } = await supabase
        .from("sessions")
        .insert({ user_id: profile.id, session_type: "text_correction", summary: text.slice(0, 80) })
        .select("id")
        .single();
      if (s?.id && errorTypes.length) {
        await supabase.from("errors").insert(
          errorTypes.map((t) => ({
            user_id: profile.id,
            session_id: s.id,
            error_type: t,
            original_text: text.trim(),
          }))
        );
      }
    } catch (e) {
      setResult(`⚠️ ${e instanceof Error ? e.message : t("correction.error")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <p className="eyebrow mb-2">{t("correction.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("correction.title")}</h1>
      <p className="text-paper-muted mb-6">
        {t("correction.intro", { variant: profile?.english_variant ?? "British" })}
      </p>

      <textarea
        aria-label={t("correction.yourText")}
        className="input min-h-[160px] resize-none mb-3"
        placeholder={t("correction.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn-coral w-full mb-8" onClick={correct} disabled={busy || !text.trim()}>
        <Sparkles size={16} /> {busy ? t("correction.checking") : t("correction.check")}
      </button>

      {result && (
        <div className="card p-5 whitespace-pre-wrap leading-relaxed animate-fade-up">
          {result.split("\n").map((line, i) => {
            const bold = line.match(/\*\*(.+?)\*\*/);
            if (bold)
              return (
                <p key={i} className="mt-3 first:mt-0 font-mono text-xs uppercase tracking-wider text-coral">
                  {bold[1]}
                </p>
              );
            if (line.startsWith("→"))
              return (
                <p key={i} className="text-paper">
                  {line.replace("→", "").trim()}
                </p>
              );
            return line.trim() ? (
              <p key={i} className="text-paper">
                {line}
              </p>
            ) : null;
          })}
          {!result.startsWith("⚠️") && (
            <div className="mt-5 pt-4 border-t border-ink-600 flex flex-wrap gap-2 whitespace-normal">
              {[
                { key: "corrected", re: /correct|correcci/i, label: t("correction.copyCorrected") },
                { key: "natural", re: /natural/i, label: t("correction.copyNatural") },
              ].map(({ key, re, label }) => {
                const value = sectionText(result, re);
                if (!value) return null;
                const done = copied === key;
                return (
                  <button key={key} className="btn-ghost text-sm px-3 py-2" onClick={() => copy(key, value)}>
                    {done ? <Check size={15} className="text-mint" /> : <Copy size={15} />}
                    {done ? t("correction.copied") : label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
