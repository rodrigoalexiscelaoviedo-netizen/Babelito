import ThemeToggle from "../components/ThemeToggle";
import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Volume2, Bell, BellOff, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { buildAnkiText, downloadAnki, ankiFileName } from "../lib/anki";
import { localDateISO } from "../lib/dates";
import { getVoices, speak } from "../lib/speech";
import { naturalVoicePref, setNaturalVoicePref } from "../lib/naturalVoice";
import { subscribeToPush, unsubscribeFromPush, getNotificationPermission } from "../lib/notifications";
import { tFor } from "../i18n";

export default function Profile() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [interests, setInterests] = useState((profile?.profile_json?.interests as string) ?? "");
  const [target, setTarget] = useState<string>(profile?.target_level ?? "B2");
  const [variant, setVariant] = useState(profile?.english_variant ?? "British");
  const [learningLanguage, setLearningLanguage] = useState<string>(profile?.learning_language ?? "en");
  const t = tFor(learningLanguage);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  // Notification settings
  const profileRaw = profile as unknown as Record<string, unknown>;
  const [notifTime, setNotifTime] = useState<string>(
    (profileRaw?.notification_time as string) ?? "09:00"
  );
  const [notifEnabled, setNotifEnabled] = useState(
    getNotificationPermission() === "granted" && Boolean(profileRaw?.notification_time)
  );
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">(
    getNotificationPermission() === "granted" ? "granted" : "idle"
  );

  // Voice settings
  const [voiceAccent, setVoiceAccent] = useState(profile?.voice_accent ?? "en-GB");
  const [voiceName, setVoiceName] = useState(profile?.voice_name ?? "");
  const [voiceRate, setVoiceRate] = useState<number>(parseFloat(String(profile?.voice_rate ?? 0.95)));
  const [naturalVoice, setNaturalVoice] = useState(naturalVoicePref);
  const [availableAccents, setAvailableAccents] = useState<string[]>(["en-GB", "en-US"]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const voiceLang = learningLanguage === "ca" ? "ca" : "en";
      const all = getVoices(voiceLang);
      const accents = [...new Set(all.map((v) => v.lang))].sort();
      const defaultAccents = learningLanguage === "ca" ? ["ca-ES"] : ["en-GB", "en-US"];
      const withFallbacks = [...new Set([...defaultAccents, ...accents])];
      setAvailableAccents(withFallbacks);
      const forAccent = all.filter((v) => v.lang === voiceAccent);
      setAvailableVoices(forAccent);
    }
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceAccent, learningLanguage]);

  function handleAccentChange(accent: string) {
    setVoiceAccent(accent);
    setVoiceName("");
  }

  function testVoice() {
    const testText = learningLanguage === "ca"
      ? "Hola! Soc el teu coach de català. Com et sents avui?"
      : "Hello! I am your English coach. How are you feeling today?";
    speak(testText, {
      voiceName: voiceName || undefined,
      rate: voiceRate,
      lang: voiceAccent,
    });
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    // Un nivel por idioma: al cambiar de idioma guardo el nivel del que dejo y cargo el
    // del que elijo. Si no tiene nivel todavía, la app manda a la prueba de nivel.
    const prevLang = profile?.learning_language || "en";
    const levels: Record<string, string> = { ...((profile?.profile_json?.levels as Record<string, string> | undefined) ?? {}) };
    const langChanged = learningLanguage !== prevLang;
    if (langChanged && profile?.current_level) levels[prevLang] = profile.current_level;
    const nextLevel = langChanged ? (levels[learningLanguage] ?? null) : (profile?.current_level ?? null);
    await supabase
      .from("profiles")
      .update({
        name,
        target_level: target,
        english_variant: variant,
        learning_language: learningLanguage,
        ...(langChanged ? { current_level: nextLevel, diagnostic_complete: nextLevel !== null } : {}),
        profile_json: { ...(profile?.profile_json ?? {}), interests, levels },
        voice_name: voiceName || null,
        voice_rate: voiceRate,
        voice_accent: voiceAccent,
        notification_time: notifEnabled ? notifTime : null,
        // Hora local del dispositivo: el cron de recordatorios la usa para disparar a la hora correcta.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .eq("id", session.user.id);
    await refreshProfile();
    setSaved(true);
    setBusy(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleToggleNotif(enabled: boolean) {
    if (!session) return;
    if (enabled) {
      try {
        const result = await subscribeToPush(session.user.id);
        const granted = result === "granted";
        setNotifEnabled(granted);
        setNotifStatus(granted ? "granted" : "denied");
      } catch {
        setNotifEnabled(false);
        setNotifStatus("denied");
      }
    } else {
      setNotifEnabled(false);
      await unsubscribeFromPush().catch(() => {});
    }
  }

  // Exporta las tarjetas de repaso (frase a decir → pista) para importar en Anki.
  async function exportAnki() {
    if (!session) return;
    setExporting(true);
    setExportMsg("");
    const { data, error } = await supabase
      .from("review_items")
      .select("content, prompt, item_type")
      .eq("user_id", session.user.id)
      .limit(2000);
    setExporting(false);
    if (error) {
      setExportMsg(t("profile.exportErrLoad"));
      return;
    }
    const rows = (data ?? []) as Array<{ content: string; prompt: string; item_type: string }>;
    if (rows.length === 0) {
      setExportMsg(t("profile.exportEmpty"));
      return;
    }
    const text = buildAnkiText(
      rows.map((r) => ({
        front: r.content,
        back: r.prompt,
        tags: `babelito ${learningLanguage} ${r.item_type}`,
      })),
      { deck: t("profile.deckName") }
    );
    downloadAnki(text, ankiFileName(learningLanguage, localDateISO()));
    setExportMsg(t("profile.exportDone", { n: rows.length }));
  }

  async function retest() {
    if (!session) return;
    await supabase.from("profiles").update({ diagnostic_complete: false }).eq("id", session.user.id);
    await refreshProfile();
    navigate("/diagnostic");
  }

  // Reinicia el onboarding completo (idioma, meta, nivel autoevaluado) sin
  // borrar la cuenta. Vuelve a mandar al flujo de onboarding desde cero.
  async function restartOnboarding() {
    if (!session) return;
    setBusy(true);
    await supabase
      .from("profiles")
      .update({ onboarding_complete: false, diagnostic_complete: false })
      .eq("id", session.user.id);
    await refreshProfile();
    setBusy(false);
    navigate("/onboarding");
  }

  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <p className="eyebrow mb-2">{t("profile.eyebrow")}</p>
      <h1 className="page-title mb-8">{t("profile.title")}</h1>

      <div className="mb-6 flex items-center justify-between rounded-xl2 border border-ink-600 bg-ink-700 px-4 py-3">
        <p className="text-sm font-medium">{t("profile.look")}</p>
        <ThemeToggle />
      </div>

      <div className="space-y-5">
        <Field label={t("profile.name")}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("profile.currentLevel")}>
            <div className="input flex items-center justify-between">
              <span className="font-display font-bold text-coral">{profile?.current_level ?? "—"}</span>
              <span className="text-xs text-paper-muted">{t("profile.measured")}</span>
            </div>
          </Field>
          <Field label={t("profile.targetLevel")}>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {["A2", "B1", "B2", "C1"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t("profile.learning")}>
          <select
            className="input"
            value={learningLanguage}
            onChange={(e) => setLearningLanguage(e.target.value)}
          >
            <option value="en">{t("profile.langEn")}</option>
            <option value="ca">{t("profile.langCa")}</option>
          </select>
        </Field>

        {learningLanguage === "en" && (
          <Field label={t("profile.accent")}>
            <select className="input" value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="British">British 🇬🇧</option>
              <option value="American">American 🇺🇸</option>
            </select>
          </Field>
        )}

        <Field label={t("profile.interests")}>
          <textarea
            className="input min-h-[100px] resize-none"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>

        {/* ─── Voice settings ─── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">{t("profile.coachVoice")}</h3>
            <button
              onClick={testVoice}
              className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-coral transition"
              type="button"
            >
              <Volume2 size={14} /> {t("profile.testVoice")}
            </button>
          </div>

          <Field label={t("profile.accent")}>
            <select
              className="input"
              value={voiceAccent}
              onChange={(e) => handleAccentChange(e.target.value)}
            >
              {availableAccents.map((a) => (
                <option key={a} value={a}>
                  {accentLabel(a)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("profile.voice")}>
            <select
              className="input"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            >
              <option value="">{t("profile.defaultAccent")}</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-paper-faint">{t("profile.voiceNote")}</p>
            {learningLanguage === "ca" && availableVoices.length === 0 && (
              <p className="mt-2 text-xs text-coral">{t("profile.noCatalanVoices")}</p>
            )}
          </Field>

          <Field label={`${t("profile.speed")}: ${voiceRate.toFixed(2)}×`}>
            {/* Atajos: 0.5× es demasiado lento para escuchar con naturalidad; el rango útil es 0.6–1.3. */}
            <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label={t("profile.speedPresets")}>
              {[
                { v: 0.75, key: "slow" },
                { v: 0.95, key: "normal" },
                { v: 1.15, key: "fast" },
              ].map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setVoiceRate(p.v)}
                  aria-pressed={Math.abs(voiceRate - p.v) < 0.03}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    Math.abs(voiceRate - p.v) < 0.03
                      ? "bg-coral text-ink-900"
                      : "bg-ink-700 text-paper-muted hover:text-paper"
                  }`}
                >
                  {t(`profile.${p.key}`)}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={voiceRate}
              onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
              className="w-full accent-coral"
              aria-label={t("profile.voiceSpeed")}
            />
            <div className="flex justify-between text-xs text-paper-faint mt-0.5">
              <span>{t("profile.rangeSlow")}</span>
              <span>{t("profile.rangeFast")}</span>
            </div>
            {/* Voz natural para inglés y catalán; si no está disponible, se usa la del navegador. */}
            {(
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-coral"
                  checked={naturalVoice}
                  onChange={(e) => {
                    setNaturalVoice(e.target.checked);
                    setNaturalVoicePref(e.target.checked);
                  }}
                />
                <span>
                  {t("profile.naturalLabel")}
                  <span className="block text-xs text-paper-muted">{t("profile.naturalHelp")}</span>
                </span>
              </label>
            )}
            {voiceRate < 0.6 && (
              <p className="mt-2 text-xs text-gold">{t("profile.slowWarning")}</p>
            )}
          </Field>
        </div>

        {/* ─── Notification settings ─── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">{t("profile.dailyReminder")}</h3>
            {notifStatus === "granted" ? (
              <Bell size={16} className="text-mint" />
            ) : (
              <BellOff size={16} className="text-paper-faint" />
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-coral"
              checked={notifEnabled}
              onChange={(e) => handleToggleNotif(e.target.checked)}
            />
            <span className="text-sm font-medium">{t("profile.enableNotif")}</span>
          </label>

          {notifEnabled && (
            <Field label={t("profile.reminderTime")}>
              <input
                type="time"
                className="input"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
              />
            </Field>
          )}

          {notifStatus === "denied" && (
            <p className="text-coral text-xs">{t("profile.deniedNotif")}</p>
          )}

          <p className="text-xs text-paper-faint leading-relaxed">{t("profile.reminderHelp")}</p>
        </div>

        <button className="btn-coral w-full" onClick={save} disabled={busy}>
          {saved ? t("profile.saved") : busy ? t("profile.saving") : t("profile.save")}
        </button>
      </div>

      <div className="mt-10 pt-6 border-t border-ink-600 space-y-3">
        <button className="btn-ghost w-full" onClick={exportAnki} disabled={exporting}>
          <Download size={16} />{" "}
          {exporting ? t("profile.preparing") : t("profile.exportAnki")}
        </button>
        {exportMsg && <p className="text-xs text-paper-muted text-center">{exportMsg}</p>}

        <button className="btn-ghost w-full" onClick={retest}>
          <RefreshCw size={16} /> {t("profile.retest")}
        </button>

        {confirmReset ? (
          <div className="card p-4 space-y-3">
            <p className="text-sm text-paper-muted">{t("profile.restartQ")}</p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-medium transition"
                onClick={() => setConfirmReset(false)}
                disabled={busy}
              >
                {t("profile.cancel")}
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-coral/20 hover:bg-coral/30 text-coral font-medium transition"
                onClick={restartOnboarding}
                disabled={busy}
              >
                {busy ? t("profile.resetting") : t("profile.restart")}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost w-full" onClick={() => setConfirmReset(true)}>
            <RefreshCw size={16} /> {t("profile.restartBtn")}
          </button>
        )}

        <button
          className="btn w-full bg-transparent border border-ink-600 text-paper-muted hover:text-coral hover:border-coral/40"
          disabled={signingOut}
          onClick={async () => {
            if (signingOut) return;
            setSigningOut(true);
            try {
              await signOut();
              navigate("/login");
            } finally {
              setSigningOut(false);
            }
          }}
        >
          <LogOut size={16} /> {signingOut ? t("common.signingOut") : t("profile.signOut")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  // La etiqueta visible no está asociada al campo: se le pasa también como aria-label al control.
  const control =
    isValidElement(children) && (children.type === "input" || children.type === "select" || children.type === "textarea")
      ? cloneElement(children as ReactElement<{ "aria-label"?: string }>, { "aria-label": label })
      : children;
  return (
    <div>
      <label className="block text-sm font-medium text-paper-muted mb-1.5">{label}</label>
      {control}
    </div>
  );
}

function accentLabel(lang: string): string {
  const map: Record<string, string> = {
    "en-GB": "British English 🇬🇧",
    "en-US": "American English 🇺🇸",
    "en-AU": "Australian English 🇦🇺",
    "en-IE": "Irish English 🇮🇪",
    "en-IN": "Indian English 🇮🇳",
    "en-NZ": "New Zealand English 🇳🇿",
    "en-ZA": "South African English 🇿🇦",
    "en-CA": "Canadian English 🇨🇦",
  };
  return map[lang] ?? lang;
}
