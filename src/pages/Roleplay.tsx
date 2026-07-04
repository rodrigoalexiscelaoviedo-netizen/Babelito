import { useEffect, useRef, useState } from "react";
import {
  Send,
  Briefcase,
  Users,
  Phone,
  Wine,
  TrendingUp,
  Coffee,
  Drama,
  Volume2,
  Pause,
  Play,
  Loader2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach } from "../lib/claude";
import { buildRoleplayPrompt, parseErrors } from "../lib/buildSystemPrompt";
import { SCENARIOS, type Scenario } from "../lib/scenarios";
import { speak, pauseSpeech, resumeSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import type { ChatTurn } from "../lib/types";
import { generateReport, type SessionReport } from "../lib/sessionReport";

const SCENARIO_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Users,
  Phone,
  Wine,
  TrendingUp,
  Coffee,
};

export default function Roleplay() {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  if (!scenario) {
    return (
      <div className="animate-fade-up">
        <p className="eyebrow mb-2">Roleplay</p>
        <h1 className="font-display text-3xl font-extrabold mb-2">Practise a real situation</h1>
        <p className="text-paper-muted mb-8">
          Your coach plays the other person. Type <span className="font-mono text-coral">/end</span>{" "}
          any time to get full feedback.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SCENARIOS.map((s) => {
            const Icon = SCENARIO_ICONS[s.icon] ?? Drama;
            return (
              <button
                key={s.id}
                onClick={() => setScenario(s)}
                className="card p-5 text-left hover:border-coral/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <Icon size={24} className="text-coral" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                    {s.difficulty}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mt-3">{s.title}</h3>
                <p className="text-sm text-paper-muted mt-1">{s.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <RoleplayChat scenario={scenario} onExit={() => setScenario(null)} key={scenario.id} />;
}

function RoleplayChat({ scenario, onExit }: { scenario: Scenario; onExit: () => void }) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: "assistant", content: scenario.opening },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSpeakIdx, setActiveSpeakIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportError, setReportError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef(profile ? buildRoleplayPrompt(profile, scenario) : "");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  function handleSpeak(text: string, index: number) {
    speak(text, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent || (profile?.english_variant === "American" ? "en-US" : "en-GB"),
    });
    setActiveSpeakIdx(index);
    setPaused(false);
  }

  function handlePauseResume() {
    if (paused) {
      resumeSpeech();
      setPaused(false);
    } else {
      pauseSpeech();
      setPaused(true);
    }
  }

  async function handleEndSession() {
    if (!profile || turns.length < 2) return;
    setGeneratingReport(true);
    setReportError("");
    try {
      const r = await generateReport(profile.id, sessionId, "roleplay", turns);
      setReport(r);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Could not generate report.");
    } finally {
      setGeneratingReport(false);
    }
  }

  async function send(text: string) {
    if (!text.trim() || !profile) return;

    // Intercept /end command
    if (text.trim().toLowerCase() === "/end") {
      setInput("");
      await handleEndSession();
      return;
    }

    const next = [...turns, { role: "user", content: text.trim() } as ChatTurn];
    setTurns(next);
    setInput("");
    setThinking(true);
    try {
      const raw = await askCoach({ system: systemRef.current, messages: next });
      const { clean, errorTypes } = parseErrors(raw);
      const updated = [...next, { role: "assistant", content: clean } as ChatTurn];
      setTurns(updated);

      let sid = sessionId;
      if (!sid) {
        const { data } = await supabase
          .from("sessions")
          .insert({ user_id: profile.id, session_type: "roleplay", topic: scenario.title })
          .select("id")
          .single();
        sid = data?.id ?? null;
        setSessionId(sid);
      }
      if (sid) {
        await supabase
          .from("sessions")
          .update({ messages: updated, ended_at: new Date().toISOString() })
          .eq("id", sid);
        if (errorTypes.length)
          await supabase.from("errors").insert(
            errorTypes.map((t) => ({
              user_id: profile.id,
              session_id: sid,
              error_type: t,
              original_text: text.trim(),
            }))
          );
      }
    } catch (e) {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Error."}` },
      ]);
    } finally {
      setThinking(false);
    }
  }

  if (report) {
    return (
      <div className="animate-fade-up max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="eyebrow mb-1">Session report · {scenario.title}</p>
            <h1 className="font-display text-2xl font-extrabold">How it went</h1>
          </div>
          <button onClick={onExit} className="text-paper-muted hover:text-paper">
            <X size={20} />
          </button>
        </div>

        <div className="card p-5 mb-4">
          <p className="text-paper leading-relaxed">{report.summary}</p>
        </div>

        {report.did_well.length > 0 && (
          <div className="card p-5 mb-4 border-mint/20">
            <p className="eyebrow text-mint mb-3">What you did well</p>
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
            <p className="eyebrow text-coral mb-3">Key errors</p>
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

        {report.suggested_chunks.length > 0 && (
          <div className="card p-5 mb-6">
            <p className="eyebrow text-gold mb-3">Chunks you could use next time</p>
            <ul className="space-y-1.5">
              {report.suggested_chunks.map((chunk, i) => (
                <li key={i} className="font-mono text-sm text-paper-muted">
                  "{chunk}"
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-paper-faint text-center mb-4">
          Generated by AI · Gemini via Supabase Edge Function
        </p>
        <button className="btn-coral w-full" onClick={onExit}>
          Back to scenarios
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="eyebrow">{scenario.title}</p>
          <p className="text-sm text-paper-muted">Playing: {scenario.coach_role}</p>
        </div>
        <div className="flex items-center gap-3">
          {reportError && <p className="text-coral text-xs">{reportError}</p>}
          <button
            onClick={handleEndSession}
            disabled={generatingReport || turns.length < 2}
            className="flex items-center gap-1.5 text-xs text-paper-muted hover:text-coral transition disabled:opacity-40"
          >
            {generatingReport ? (
              <><Loader2 size={13} className="animate-spin" /> Generating…</>
            ) : (
              "End & report →"
            )}
          </button>
          <button className="text-sm text-paper-muted hover:text-paper" onClick={onExit}>
            Leave
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl2 px-4 py-3 ${
                t.role === "user" ? "bg-coral text-ink-900" : "card"
              }`}
            >
              {t.role === "assistant" ? (
                <div>
                  <div className="flex justify-end gap-1 mb-1">
                    {activeSpeakIdx === i && (
                      <button
                        onClick={handlePauseResume}
                        className="text-paper-faint hover:text-mint transition"
                        aria-label={paused ? "Resume" : "Pause"}
                      >
                        {paused ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleSpeak(t.content, i)}
                      className="text-paper-faint hover:text-coral transition"
                      aria-label="Read aloud"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-paper-muted">…</div>
          </div>
        )}
      </div>

      <div className="pt-3">
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="flex-1 resize-none bg-transparent px-2 py-2 text-paper placeholder:text-paper-faint focus:outline-none max-h-32"
            rows={1}
            placeholder="Your line… (type /end for feedback)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="grid h-10 w-10 place-items-center rounded-xl bg-coral text-ink-900 hover:bg-coral-soft disabled:opacity-40 transition"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
