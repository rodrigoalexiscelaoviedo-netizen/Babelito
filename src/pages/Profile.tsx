import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getVoices, speak } from "../lib/speech";

export default function Profile() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [interests, setInterests] = useState((profile?.profile_json?.interests as string) ?? "");
  const [target, setTarget] = useState<string>(profile?.target_level ?? "B2");
  const [variant, setVariant] = useState(profile?.english_variant ?? "British");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Voice settings
  const [voiceAccent, setVoiceAccent] = useState(profile?.voice_accent ?? "en-GB");
  const [voiceName, setVoiceName] = useState(profile?.voice_name ?? "");
  const [voiceRate, setVoiceRate] = useState<number>(profile?.voice_rate ?? 0.95);
  const [availableAccents, setAvailableAccents] = useState<string[]>(["en-GB", "en-US"]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const all = getVoices("en");
      const accents = [...new Set(all.map((v) => v.lang))].sort();
      const withFallbacks = [...new Set(["en-GB", "en-US", ...accents])];
      setAvailableAccents(withFallbacks);
      const forAccent = all.filter((v) => v.lang === voiceAccent);
      setAvailableVoices(forAccent);
    }
    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceAccent]);

  function handleAccentChange(accent: string) {
    setVoiceAccent(accent);
    setVoiceName("");
  }

  function testVoice() {
    speak("Hello! I am your English coach. How are you feeling today?", {
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
        profile_json: { ...(profile?.profile_json ?? {}), interests },
        voice_name: voiceName || null,
        voice_rate: voiceRate,
        voice_accent: voiceAccent,
      })
      .eq("id", session.user.id);
    await refreshProfile();
    setSaved(true);
    setBusy(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function retest() {
    if (!session) return;
    await supabase.from("profiles").update({ diagnostic_complete: false }).eq("id", session.user.id);
    await refreshProfile();
    navigate("/diagnostic");
  }

  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <p className="eyebrow mb-2">Profile</p>
      <h1 className="font-display text-3xl font-extrabold mb-8">Your settings</h1>

      <div className="space-y-5">
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Current level">
            <div className="input flex items-center justify-between">
              <span className="font-display font-bold text-coral">{profile?.current_level ?? "—"}</span>
              <span className="text-xs text-paper-muted">measured</span>
            </div>
          </Field>
          <Field label="Target level">
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {["A2", "B1", "B2", "C1"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Accent">
          <select className="input" value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="British">British 🇬🇧</option>
            <option value="American">American 🇺🇸</option>
          </select>
        </Field>

        <Field label="What you like talking about">
          <textarea
            className="input min-h-[100px] resize-none"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>

        {/* ─── Voice settings ─── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">Coach voice</h3>
            <button
              onClick={testVoice}
              className="flex items-center gap-1.5 text-sm text-paper-muted hover:text-coral transition"
              type="button"
            >
              <Volume2 size={14} /> Test voice
            </button>
          </div>

          <Field label="Accent">
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

          <Field label="Voice">
            <select
              className="input"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            >
              <option value="">— Default for accent —</option>
              {availableVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-paper-faint">
              Available voices depend on your device.
            </p>
          </Field>

          <Field label={`Speed: ${voiceRate.toFixed(2)}×`}>
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
              <span>0.5× slow</span>
              <span>1.5× fast</span>
            </div>
          </Field>
        </div>

        <button className="btn-coral w-full" onClick={save} disabled={busy}>
          {saved ? "Saved ✓" : busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="mt-10 pt-6 border-t border-ink-600 space-y-3">
        <button className="btn-ghost w-full" onClick={retest}>
          <RefreshCw size={16} /> Retake the level test
        </button>
        <button
          className="btn w-full bg-transparent border border-ink-600 text-paper-muted hover:text-coral hover:border-coral/40"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          <LogOut size={16} /> Sign out
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
