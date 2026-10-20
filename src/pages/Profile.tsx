import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Volume2, Bell, BellOff, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { buildAnkiText, downloadAnki, ankiFileName } from "../lib/anki";
import { localDateISO } from "../lib/dates";
import { getVoices, speak } from "../lib/speech";
import { subscribeToPush, unsubscribeFromPush, getNotificationPermission } from "../lib/notifications";

export default function Profile() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [interests, setInterests] = useState((profile?.profile_json?.interests as string) ?? "");
  const [target, setTarget] = useState<string>(profile?.target_level ?? "B2");
  const [variant, setVariant] = useState(profile?.english_variant ?? "British");
  const [learningLanguage, setLearningLanguage] = useState<string>(profile?.learning_language ?? "en");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { t } = useTranslation();
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
    await supabase
      .from("profiles")
      .update({
        name,
        target_level: target,
        english_variant: variant,
        learning_language: learningLanguage,
        profile_json: { ...(profile?.profile_json ?? {}), interests },
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
      setExportMsg(learningLanguage === "ca" ? "No s'han pogut carregar les targetes." : "Couldn't load your cards.");
      return;
    }
    const rows = (data ?? []) as Array<{ content: string; prompt: string; item_type: string }>;
    if (rows.length === 0) {
      setExportMsg(learningLanguage === "ca" ? "Encara no tens targetes de repàs." : "You don't have review cards yet.");
      return;
    }
    const text = buildAnkiText(
      rows.map((r) => ({
        front: r.content,
        back: r.prompt,
        tags: `babelito ${learningLanguage} ${r.item_type}`,
      })),
      { deck: `Babelito ${learningLanguage === "ca" ? "Català" : "English"}` }
    );
    downloadAnki(text, ankiFileName(learningLanguage, localDateISO()));
    setExportMsg(
      learningLanguage === "ca"
        ? `${rows.length} targetes exportades. Importa el fitxer a Anki (Fitxer → Importa).`
        : `${rows.length} cards exported. Import the file in Anki (File → Import).`
    );
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
      <p className="eyebrow mb-2">{learningLanguage === "ca" ? "Perfil" : "Profile"}</p>
      <h1 className="font-display text-3xl font-extrabold mb-8">{learningLanguage === "ca" ? "La teva configuració" : "Your settings"}</h1>

      <div className="space-y-5">
        <Field label={learningLanguage === "ca" ? "Nom" : "Name"}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={learningLanguage === "ca" ? "Nivell actual" : "Current level"}>
            <div className="input flex items-center justify-between">
              <span className="font-display font-bold text-coral">{profile?.current_level ?? "—"}</span>
              <span className="text-xs text-paper-muted">{learningLanguage === "ca" ? "mesurat" : "measured"}</span>
            </div>
          </Field>
          <Field label={learningLanguage === "ca" ? "Nivell objectiu" : "Target level"}>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {["A2", "B1", "B2", "C1"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={learningLanguage === "ca" ? "Aprenent" : "Learning"}>
          <select
            className="input"
            value={learningLanguage}
            onChange={(e) => setLearningLanguage(e.target.value)}
          >
            <option value="en">English 🇬🇧</option>
            <option value="ca">Català</option>
          </select>
        </Field>

        {learningLanguage === "en" && (
          <Field label="Accent">
            <select className="input" value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="British">British 🇬🇧</option>
              <option value="American">American 🇺🇸</option>
            </select>
          </Field>
        )}

        <Field label={learningLanguage === "ca" ? "De què t'agrada parlar" : "What you like talking about"}>
          <textarea
            className="input min-h-[100px] resize-none"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>

        {/* ─── Voice settings ─── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">{learningLanguage === "ca" ? "Veu del coach" : "Coach voice"}</h3>
            <button
              onClick={testVoice}
              className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-coral transition"
              type="button"
            >
              <Volume2 size={14} /> {learningLanguage === "ca" ? "Provar veu" : "Test voice"}
            </button>
          </div>

          <Field label={learningLanguage === "ca" ? "Accent" : "Accent"}>
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

          <Field label={learningLanguage === "ca" ? "Veu" : "Voice"}>
            <select
              className="input"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            >
              <option value="">{learningLanguage === "ca" ? "— Per defecte per a l'accent —" : "— Default for accent —"}</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-paper-faint">
              {learningLanguage === "ca" ? "Les veus disponibles depenen del teu dispositiu." : "Available voices depend on your device."}
            </p>
            {learningLanguage === "ca" && availableVoices.length === 0 && (
              <p className="mt-2 text-xs text-coral">
                No hi ha voces en català disponibles en aquest dispositiu. Prova d'usar el navegador Chrome o Firefox en Android.
              </p>
            )}
          </Field>

          <Field label={`${learningLanguage === "ca" ? "Velocitat" : "Speed"}: ${voiceRate.toFixed(2)}×`}>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={voiceRate}
              onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
              className="w-full accent-coral"
            />
            <div className="flex justify-between text-xs text-paper-faint mt-0.5">
              <span>{learningLanguage === "ca" ? "0.5× lent" : "0.5× slow"}</span>
              <span>{learningLanguage === "ca" ? "1.5× ràpid" : "1.5× fast"}</span>
            </div>
          </Field>
        </div>

        {/* ─── Notification settings ─── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">{learningLanguage === "ca" ? "Recordatori diari" : "Daily reminder"}</h3>
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
            <span className="text-sm font-medium">{learningLanguage === "ca" ? "Activar notificacions diàries" : "Activate daily notifications"}</span>
          </label>

          {notifEnabled && (
            <Field label={learningLanguage === "ca" ? "Hora de recordatori" : "Reminder time"}>
              <input
                type="time"
                className="input"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
              />
            </Field>
          )}

          {notifStatus === "denied" && (
            <p className="text-coral text-xs">
              {learningLanguage === "ca" ? "Permís denegat. Habilita les notificacions per a aquest lloc en la configuració del navegador." : "Permission was denied. Enable notifications for this site in your browser settings."}
            </p>
          )}

          <p className="text-xs text-paper-faint leading-relaxed">
            {learningLanguage === "ca" ? "Rebràs el recordatori a l'hora escollida, encara que l'app estigui tancada. Activat per dispositiu." : "You'll get the reminder at the chosen time, even when the app is closed. Set per device."}
          </p>
        </div>

        <button className="btn-coral w-full" onClick={save} disabled={busy}>
          {saved ? (learningLanguage === "ca" ? "Guardat ✓" : "Saved ✓") : busy ? (learningLanguage === "ca" ? "Guardant…" : "Saving…") : (learningLanguage === "ca" ? "Guardar canvis" : "Save changes")}
        </button>
      </div>

      <div className="mt-10 pt-6 border-t border-ink-600 space-y-3">
        <button className="btn-ghost w-full" onClick={exportAnki} disabled={exporting}>
          <Download size={16} />{" "}
          {exporting
            ? (learningLanguage === "ca" ? "Preparant…" : "Preparing…")
            : (learningLanguage === "ca" ? "Exporta les targetes a Anki" : "Export my cards to Anki")}
        </button>
        {exportMsg && <p className="text-xs text-paper-muted text-center">{exportMsg}</p>}

        <button className="btn-ghost w-full" onClick={retest}>
          <RefreshCw size={16} /> {learningLanguage === "ca" ? "Repetir la prova de nivell" : "Retake the level test"}
        </button>

        {confirmReset ? (
          <div className="card p-4 space-y-3">
            <p className="text-sm text-paper-muted">
              {learningLanguage === "ca" ? "Reiniciar l'incorporació? Triaràs de nou l'idioma, l'objectiu i el nivell. El teu compte i l'historial es mantenen." : "Restart onboarding? You'll choose your language, goal and level again. Your account and history stay."}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-medium transition"
                onClick={() => setConfirmReset(false)}
                disabled={busy}
              >
                {learningLanguage === "ca" ? "Cancelar" : "Cancel"}
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl bg-coral/20 hover:bg-coral/30 text-coral font-medium transition"
                onClick={restartOnboarding}
                disabled={busy}
              >
                {busy ? (learningLanguage === "ca" ? "Reiniciant…" : "Resetting…") : (learningLanguage === "ca" ? "Reiniciar" : "Restart")}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost w-full" onClick={() => setConfirmReset(true)}>
            <RefreshCw size={16} /> {learningLanguage === "ca" ? "Reiniciar l'incorporació" : "Restart onboarding"}
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
          <LogOut size={16} /> {signingOut ? t("common.signingOut") : learningLanguage === "ca" ? "Tancar sessió" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-paper-muted mb-1.5">{label}</label>
      {children}
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
