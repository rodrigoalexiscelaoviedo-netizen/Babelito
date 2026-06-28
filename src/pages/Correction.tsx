import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach } from "../lib/claude";
import { buildCorrectionPrompt, parseErrors } from "../lib/buildSystemPrompt";

export default function Correction() {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function correct() {
    if (!text.trim() || !profile) return;
    setBusy(true);
    setResult(null);
    try {
      const raw = await askCoach({
        system: buildCorrectionPrompt(profile),
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
      setResult(`⚠️ ${e instanceof Error ? e.message : "Error."}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <p className="eyebrow mb-2">Writing check</p>
      <h1 className="font-display text-3xl font-extrabold mb-2">Fix my writing</h1>
      <p className="text-paper-muted mb-6">
        Paste an email or message. You'll get it corrected, made more natural, and in real{" "}
        {profile?.english_variant ?? "British"} English.
      </p>

      <textarea
        className="input min-h-[160px] resize-none mb-3"
        placeholder="Paste your English text here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn-coral w-full mb-8" onClick={correct} disabled={busy || !text.trim()}>
        <Sparkles size={16} /> {busy ? "Checking…" : "Check it"}
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
        </div>
      )}
    </div>
  );
}
