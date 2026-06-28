import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [interests, setInterests] = useState((profile?.profile_json?.interests as string) ?? "");
  const [target, setTarget] = useState<string>(profile?.target_level ?? "B2");
  const [variant, setVariant] = useState(profile?.english_variant ?? "British");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

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
