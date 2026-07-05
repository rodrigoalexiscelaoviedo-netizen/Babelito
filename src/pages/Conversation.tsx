import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, Send, Volume2, Square, Pause, Play, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach, RetryableError } from "../lib/claude";
import { buildConversationPrompt, parseErrors } from "../lib/buildSystemPrompt";
import {
  createRecognizer,
  speechSupported,
  speak,
  pauseSpeech,
  resumeSpeech,
  type Recognizer,
} from "../lib/speech";
import { useVoicePrefs, type VoicePrefs } from "../lib/useVoicePrefs";
import type { ChatTurn, DetectedError } from "../lib/types";
import VoiceOrb from "../components/VoiceOrb";
import { generateReport, type SessionReport } from "../lib/sessionReport";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { BrandDots } from "../components/Loader";

const TOPICS = ["Your work", "Your weekend", "A goal you have", "Something you enjoy", "Free chat"];

export default function Conversation() {
  const { profile } = useAuth();
  const location = useLocation();
  const voicePrefs = useVoicePrefs();

  // Support pre-seeded topic from Dashboard daily lesson
  const locationTopic = (location.state as { topic?: string } | null)?.topic ?? null;
  const [topic, setTopic] = useState<string | null>(locationTopic);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportError, setReportError] = useState("");
  const [retryText, setRetryText] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);

  const recognizerRef = useRef<Recognizer | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<string>("");

  // ── Hint pasivo ──────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("errors")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      systemRef.current = buildConversationPrompt({
        profile,
        recentErrors: (data as DetectedError[]) ?? [],
        topic: topic ?? undefined,
      });
    })();
  }, [profile, topic]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  // Arrancar timer de hint cuando el coach termina de responder
  const lastRole = turns[turns.length - 1]?.role;
  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setShowHint(false);
    setHintText("");
    if (!thinking && lastRole === "assistant") {
      hintTimerRef.current = setTimeout(() => setShowHint(true), 11000);
    }
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking, lastRole, turns.length]);

  // Ocultar hint cuando el usuario empieza a escribir o a grabar
  useEffect(() => {
    if (input.trim() || listening) {
      setShowHint(false);
      setHintText("");
      if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    }
  }, [input, listening]);

  async function ensureSession(): Promise<string | null> {
    if (sessionId || !profile) return sessionId;
    const { data } = await supabase
      .from("sessions")
      .insert({ user_id: profile.id, session_type: "conversation", topic })
      .select("id")
      .single();
    const id = data?.id ?? null;
    setSessionId(id);
    return id;
  }

  async function send(text: string) {
    if (!text.trim() || !profile) return;
    const userTurn: ChatTurn = { role: "user", content: text.trim() };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setInput("");
    setInterim("");
    setThinking(true);

    try {
      const raw = await askCoach({ system: systemRef.current, messages: nextTurns });
      const { clean, errorTypes } = parseErrors(raw);
      const coachTurn: ChatTurn = { role: "assistant", content: clean };
      const updated = [...nextTurns, coachTurn];
      setTurns(updated);

      const sid = await ensureSession();
      if (sid) {
        if (errorTypes.length) {
          await supabase.from("errors").insert(
            errorTypes.map((t) => ({
              user_id: profile.id,
              session_id: sid,
              error_type: t,
              original_text: text.trim(),
            }))
          );
        }
        await supabase
          .from("sessions")
          .update({
            messages: updated,
            duration_seconds: Math.round((Date.now() - startedAt) / 1000),
            ended_at: new Date().toISOString(),
          })
          .eq("id", sid);
      }
    } catch (e) {
      if (e instanceof RetryableError) {
        setRetryText(text.trim());
        // Remove the optimistic user turn from the list — user will retry
        setTurns((prev) => prev.slice(0, -1));
      } else {
        setTurns((t) => [
          ...t,
          { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Connection error."}` },
        ]);
      }
    } finally {
      setThinking(false);
    }
  }

  async function handleEndSession() {
    if (!profile || turns.length < 2) return;
    setGeneratingReport(true);
    setReportError("");
    try {
      const r = await generateReport(profile.id, sessionId, "conversation", turns);
      setReport(r);
      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Could not generate report.");
    } finally {
      setGeneratingReport(false);
    }
  }

  async function getHint() {
    if (!profile || turns.length === 0) return;
    const lastCoachMsg = [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";
    setHintLoading(true);
    try {
      const hint = await askCoach({
        system: `You are a friendly English coach. The student is struggling to respond.
Give ONE very short hint (max 12 words): a sentence starter, a key word, or a simple phrase they could use.
Do NOT give the full answer. Student level: ${profile.current_level ?? "B1"}.
Reply with only the hint text — no explanation, no punctuation around it.`,
        messages: [{ role: "user", content: `Coach said: "${lastCoachMsg}"\nGive a hint to help the student respond.` }],
        maxTokens: 50,
      });
      setHintText(hint.trim().replace(/^["']|["']$/g, ""));
    } catch {
      setHintText('Try: "I think...", "Actually...", or "In my opinion..."');
    } finally {
      setHintLoading(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = createRecognizer({
      lang: profile?.english_variant === "American" ? "en-US" : "en-GB",
      onInterim: setInterim,
      onResult: (t) => setInput((prev) => (prev ? prev + " " : "") + t),
      onEnd: () => setListening(false),
    });
    if (!rec) return;
    recognizerRef.current = rec;
    rec.start();
    setListening(true);
  }

  if (report) {
    return <ReportPanel report={report} onClose={() => setReport(null)} />;
  }

  // Achievement overlay (shown over chat UI, not report)
  if (newAchievements.length > 0) {
    return (
      <AchievementCelebration
        achievements={newAchievements}
        onClose={() => {
          if (profile) markSeen(profile.id, newAchievements.map((a) => a.key));
          setNewAchievements([]);
        }}
      />
    );
  }

  if (turns.length === 0) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto">
        <p className="eyebrow mb-2">Live conversation</p>
        <h1 className="font-display text-3xl font-extrabold mb-2">What should we talk about?</h1>
        <p className="text-paper-muted mb-8">
          Pick a topic or just start. Your coach adapts to your {profile?.current_level ?? "level"}{" "}
          and watches the mistakes you tend to make.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`card px-4 py-4 text-left font-medium transition ${
                topic === t ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              {t}
            </button>
          ))}
          {/* Show daily topic if it's not in the list */}
          {locationTopic && !TOPICS.includes(locationTopic) && (
            <button
              onClick={() => setTopic(locationTopic)}
              className={`card px-4 py-4 text-left font-medium transition sm:col-span-2 ${
                topic === locationTopic ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              {locationTopic}
              <span className="ml-2 text-xs text-coral font-mono">· today's topic</span>
            </button>
          )}
        </div>
        <button
          className="btn-coral w-full"
          onClick={() =>
            send(
              topic && topic !== "Free chat"
                ? `Hi! I'd like to talk about: ${topic.toLowerCase()}.`
                : "Hi! I'm ready to practise."
            )
          }
        >
          Start talking →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header with end button */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-paper-muted font-mono uppercase tracking-widest">
          {topic ?? "Free chat"}
        </p>
        <button
          onClick={handleEndSession}
          disabled={generatingReport || turns.length < 2}
          className="flex items-center gap-1.5 text-xs text-paper-muted hover:text-coral transition disabled:opacity-40"
        >
          {generatingReport ? (
            <span className="flex items-center gap-2"><BrandDots /> Generating report…</span>
          ) : (
            "Finish & see report →"
          )}
        </button>
      </div>
      {reportError && <p className="text-coral text-xs mb-2">{reportError}</p>}

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl2 px-4 py-3 ${
                t.role === "user"
                  ? "bg-coral text-ink-900"
                  : "card whitespace-pre-wrap leading-relaxed"
              }`}
            >
              {t.role === "assistant" ? (
                <CoachMessage
                  text={t.content}
                  variant={profile?.english_variant ?? "British"}
                  voicePrefs={voicePrefs}
                />
              ) : (
                t.content
              )}
            </div>
          </div>
        ))}
        {retryText && !thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 border-gold/30 max-w-[85%]">
              <p className="text-sm text-paper-muted mb-2">
                El coach está con mucha demanda ahora mismo. Probá de nuevo.
              </p>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition"
                onClick={() => { const t = retryText; setRetryText(null); send(t); }}
              >
                <Loader2 size={12} /> Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── Hint pasivo — aparece a los 11 s sin actividad ── */}
        {showHint && !thinking && (
          <div className="flex justify-start animate-fade-up">
            <div className="card max-w-[80%] px-3 py-2.5 border-gold/30">
              {hintText ? (
                <>
                  <p className="text-[10px] text-gold font-mono uppercase tracking-widest mb-1">💡 Hint</p>
                  <p className="text-sm text-paper-muted">{hintText}</p>
                </>
              ) : (
                <button
                  onClick={getHint}
                  disabled={hintLoading}
                  className="flex items-center gap-2 text-xs text-paper-faint hover:text-gold transition disabled:opacity-60"
                >
                  {hintLoading ? <BrandDots /> : <span>💡</span>}
                  {hintLoading ? "Getting hint…" : "Need a hint?"}
                </button>
              )}
            </div>
          </div>
        )}

        {thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-paper-muted">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 rounded-full bg-paper-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-paper-muted animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-2 w-2 rounded-full bg-paper-muted animate-bounce" style={{ animationDelay: "240ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3">
        {listening && (
          <div className="mb-2">
            <VoiceOrb listening={listening} />
            {interim && <p className="text-center text-sm text-paper-muted italic">{interim}</p>}
          </div>
        )}
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="flex-1 resize-none bg-transparent px-2 py-2 text-paper placeholder:text-paper-faint focus:outline-none max-h-32"
            rows={1}
            placeholder="Type in English… or tap the mic"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          {speechSupported() && (
            <button
              onClick={toggleMic}
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                listening ? "bg-coral text-ink-900" : "bg-ink-600 text-paper hover:bg-ink-500"
              }`}
              aria-label={listening ? "Stop recording" : "Start recording"}
            >
              {listening ? <Square size={17} /> : <Mic size={18} />}
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="grid h-10 w-10 place-items-center rounded-xl bg-coral text-ink-900 hover:bg-coral-soft disabled:opacity-40 transition"
            aria-label="Send"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachMessage({
  text,
  variant,
  voicePrefs,
}: {
  text: string;
  variant: string;
  voicePrefs: VoicePrefs;
}) {
  const [paused, setPaused] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  function handleSpeak() {
    speak(text, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent || (variant === "American" ? "en-US" : "en-GB"),
    });
    setSpeaking(true);
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

  return (
    <div>
      <div className="flex justify-end gap-1 mb-1">
        {speaking && (
          <button
            onClick={handlePauseResume}
            className="text-paper-faint hover:text-mint transition"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        )}
        <button
          onClick={handleSpeak}
          className="text-paper-faint hover:text-coral transition"
          aria-label="Read aloud"
        >
          <Volume2 size={15} />
        </button>
      </div>
      {text.split("\n").map((line, i) => {
        const bold = line.match(/\*\*(.+?)\*\*/);
        if (bold) {
          return (
            <p key={i} className="mt-2 font-mono text-xs uppercase tracking-wider text-coral">
              {bold[1]}
            </p>
          );
        }
        if (line.startsWith("→")) {
          return (
            <p key={i} className="text-paper">
              {line.replace("→", "").trim()}
            </p>
          );
        }
        return line.trim() ? (
          <p key={i} className="text-paper">
            {line}
          </p>
        ) : null;
      })}
    </div>
  );
}

function ReportPanel({ report, onClose }: { report: SessionReport; onClose: () => void }) {
  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">Session report</p>
          <h1 className="font-display text-2xl font-extrabold">How it went</h1>
        </div>
        <button onClick={onClose} className="text-paper-muted hover:text-paper">
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
      <button className="btn-coral w-full" onClick={onClose}>
        Back to conversation
      </button>
    </div>
  );
}

export { ReportPanel };
export type { SessionReport };
export { ChevronDown, ChevronUp };
