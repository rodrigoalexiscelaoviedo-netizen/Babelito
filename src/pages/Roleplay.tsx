import { useHistoryBack } from "../lib/useHistoryBack";
import { awardSessionXp } from "../lib/xp";
import { SuggestedChunks, XpEarned } from "../components/ReportExtras";
import { useTranslation } from "react-i18next";
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
  X,
  Mic,
  Square,
} from "lucide-react";
import { BrandDots } from "../components/Loader";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach, recentTurns, RetryableError } from "../lib/claude";
import { buildRoleplayPrompt, parseErrors } from "../lib/buildSystemPrompt";
import { SCENARIOS, SCENARIOS_CA, type Scenario } from "../lib/scenarios";
import { speak, pauseSpeech, resumeSpeech, speechSupported } from "../lib/speech";
import { useSpeechCapture } from "../lib/useSpeechCapture";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import type { ChatTurn } from "../lib/types";
import { generateReport, type SessionReport } from "../lib/sessionReport";
import { MIN_USER_TURNS, countUserTurns, turnsRemaining } from "../lib/practice";
import ShadowingBlock from "../components/ShadowingBlock";

const SCENARIO_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Users,
  Phone,
  Wine,
  TrendingUp,
  Coffee,
};

export default function Roleplay() {
  const { profile } = useAuth();
  const learningLanguage = profile?.learning_language || "en";
  const [scenario, setScenario] = useState<Scenario | null>(null);
  useHistoryBack(scenario !== null, () => setScenario(null));

  if (!scenario) {
    return (
      <div className="animate-fade-up">
        <p className="eyebrow mb-2">{learningLanguage === "ca" ? "Rol" : "Roleplay"}</p>
        <h1 className="page-title mb-2">{learningLanguage === "ca" ? "Practica una situació real" : "Practise a real situation"}</h1>
        <p className="text-paper-muted mb-8">
          {learningLanguage === "ca" ? "El teu coach fa l'altra persona. Escriu " : "Your coach plays the other person. Type "}<span className="font-mono text-coral">/end</span>{" "}
          {learningLanguage === "ca" ? "en qualsevol moment per obtenir retroalimentació completa." : "any time to get full feedback."}
        </p>
        <div className="grid sm:grid-cols-2 gap-4 stagger">
          {(learningLanguage === "ca" ? SCENARIOS_CA : SCENARIOS).map((s) => {
            const Icon = SCENARIO_ICONS[s.icon] ?? Drama;
            return (
              <button
                key={s.id}
                onClick={() => setScenario(s)}
                className="card-interactive p-5 text-left group"
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
  const { t } = useTranslation();
  const { profile } = useAuth();
  const learningLanguage = profile?.learning_language || "en";
  const voicePrefs = useVoicePrefs();
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: "assistant", content: scenario.opening },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeSpeakIdx, setActiveSpeakIdx] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [shadowIdx, setShadowIdx] = useState<number | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportCounted, setReportCounted] = useState(true);
  const [reportError, setReportError] = useState("");
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [startedAt] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef(
    profile ? buildRoleplayPrompt(profile, scenario, profile?.learning_language || "en") : ""
  );
  const sessionIdRef = useRef<string | null>(null);
  const creatingSessionRef = useRef<Promise<string | null> | null>(null);

  // Guard en ref, no en estado: dos envíos rápidos insertaban dos sesiones.
  async function ensureSession(): Promise<string | null> {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (creatingSessionRef.current) return creatingSessionRef.current;
    if (!profile) return null;

    creatingSessionRef.current = (async () => {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: profile.id, session_type: "roleplay", topic: scenario.title })
        .select("id")
        .single();
      if (error) {
        creatingSessionRef.current = null;
        return null;
      }
      const id = (data?.id as string | undefined) ?? null;
      sessionIdRef.current = id;
      setSessionId(id);
      return id;
    })();

    return creatingSessionRef.current;
  }

  const voice = useSpeechCapture(
    profile?.learning_language || "en",
    profile?.english_variant ?? undefined,
    { mode: "turn" }
  );
  const listening = voice.isRecording;

  // El hook es la única fuente de verdad mientras se graba (ver Conversation.tsx).
  const displayValue = listening
    ? [input, voice.finalText, voice.interim].filter((s) => s.trim()).join(" ")
    : input;

  // ── Hint pasivo ──────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  // Ocultar hint cuando el usuario empieza a hablar
  useEffect(() => {
    if (listening) {
      setShowHint(false);
      setHintText("");
      if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    }
  }, [listening]);

  function toggleMic() {
    if (listening) {
      voice.stop();   // el callback de start() hace el commit
      return;
    }
    voice.start((finalText) => {
      if (!finalText.trim()) return;
      setInput((prev) => (prev.trim() ? `${prev.trim()} ` : "") + finalText.trim());
    });
  }

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

  async function getHint() {
    if (!profile || turns.length === 0) return;
    const lastCoachMsg = [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";
    setHintLoading(true);
    try {
      const hint = await askCoach({
        system: `You are an English roleplay coach. The student is stuck and needs a small push.
Give ONE short hint (max 12 words): a phrase they could say, a vocabulary hint, or a sentence starter.
Do NOT reveal what the "correct" full answer is. Student level: ${profile.current_level ?? "B1"}.
Reply with only the hint text.`,
        messages: [{ role: "user", content: `Coach said: "${lastCoachMsg}"\nGive a brief hint.` }],
        maxTokens: 50,
      });
      setHintText(hint.trim().replace(/^["']|["']$/g, ""));
    } catch {
      setHintText('Try: "Could you...", "I\'d like to...", or "Actually..."');
    } finally {
      setHintLoading(false);
    }
  }

  async function handleEndSession() {
    if (!profile || turns.length === 0) return;
    setGeneratingReport(true);
    setReportError("");
    try {
      const sid = sessionIdRef.current ?? sessionId;
      const r = await generateReport(profile.id, sid, "roleplay", turns, profile.learning_language || "en");
      const userTurns = countUserTurns(turns);
      const counts = userTurns >= MIN_USER_TURNS;

      if (sid && counts) {
        void awardSessionXp(profile.id, sid, "roleplay", userTurns, Math.round((Date.now() - startedAt) / 1000)).then(setXpEarned);
        const { error } = await supabase
          .from("sessions")
          .update({
            completed: true,
            turn_count: userTurns,
            ended_at: new Date().toISOString(),
            duration_seconds: Math.round((Date.now() - startedAt) / 1000),
          })
          .eq("id", sid);
        if (error) {
          setReportError(`No se pudo registrar la sesión: ${error.message}`);
        }
      }

      setReportCounted(counts);
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
      const raw = await askCoach({ system: systemRef.current, messages: recentTurns(next) });
      const { clean, errorTypes } = parseErrors(raw);
      const updated = [...next, { role: "assistant", content: clean } as ChatTurn];
      setTurns(updated);

      const sid = await ensureSession();
      if (sid) {
        await supabase
          .from("sessions")
          .update({
            messages: updated,
            ended_at: new Date().toISOString(),
            duration_seconds: Math.round((Date.now() - startedAt) / 1000),
          })
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
      if (e instanceof RetryableError) {
        setRetryText(text.trim());
        setTurns((prev) => prev.slice(0, -1));
      } else {
        setTurns((t) => [
          ...t,
          { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Error."}` },
        ]);
      }
    } finally {
      setThinking(false);
    }
  }

  if (report) {
    const learningLanguage = profile?.learning_language || "en";
    return (
      <div className="animate-fade-up max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="eyebrow mb-1">{learningLanguage === "ca" ? "Reporte de sessió" : "Session report"} · {scenario.title}</p>
            <h1 className="font-display text-2xl font-extrabold">{learningLanguage === "ca" ? "Com ha anat" : "How it went"}</h1>
            <div className="mt-2"><XpEarned amount={xpEarned} learningLanguage={learningLanguage} /></div>
          </div>
          <button onClick={onExit} aria-label={t("common.close")} className="text-paper-muted hover:text-paper">
            <X size={20} />
          </button>
        </div>

        {!reportCounted && (
          <div className="card p-4 mb-4 border-gold/40">
            <p className="text-sm text-gold font-medium mb-1">{learningLanguage === "ca" ? "Aquesta sessió no s'ha registrat" : "This session wasn't saved"}</p>
            <p className="text-xs text-paper-muted">
              {learningLanguage === "ca"
                ? `Ha estat massa curta: calen almenys ${MIN_USER_TURNS} intercanvis perquè compti. L'informe de sota segueix sent vàlid.`
                : `Too short: you need at least ${MIN_USER_TURNS} exchanges for it to count towards your streak. The report below is still valid.`}
            </p>
          </div>
        )}
        {reportError && (
          <div className="card p-4 mb-4 border-coral/40">
            <p className="text-sm text-coral">{reportError}</p>
          </div>
        )}

        <div className="card p-5 mb-4">
          <p className="text-paper leading-relaxed">{report.summary}</p>
        </div>

        {report.did_well.length > 0 && (
          <div className="card p-5 mb-4 border-mint/20">
            <p className="eyebrow text-mint mb-3">{learningLanguage === "ca" ? "El que vas fer bé" : "What you did well"}</p>
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
            <p className="eyebrow text-coral mb-3">{learningLanguage === "ca" ? "Errors claus" : "Key errors"}</p>
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
          userId={profile?.id}
          learningLanguage={learningLanguage}
          title={learningLanguage === "ca" ? "Fragments que pots usar la pròxima vegada" : "Chunks you could use next time"}
        />

        <p className="text-xs text-paper-faint text-center mb-4">
          {learningLanguage === "ca" ? "Escrit pel teu coach d’IA" : "Written by your AI coach"}
        </p>
        <button className="btn-coral w-full" onClick={onExit}>
          {learningLanguage === "ca" ? "Torna als escenaris" : "Back to scenarios"}
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
            disabled={generatingReport || turns.length === 0}
            className="flex items-center gap-1.5 text-xs text-paper-muted hover:text-coral transition disabled:opacity-40"
          >
            {generatingReport ? (
              <span className="flex items-center gap-2"><BrandDots /> {learningLanguage === "ca" ? "Generant…" : "Generating…"}</span>
            ) : (
              learningLanguage === "ca" ? "Finalitzar i reporte →" : "End & report →"
            )}
          </button>
          <button className="text-sm text-paper-muted hover:text-paper" onClick={onExit}>
            {learningLanguage === "ca" ? "Sortir" : "Leave"}
          </button>
        </div>
      </div>

      {/* Estado real de registro */}
      <div className="mb-2 text-right">
        {turnsRemaining(turns) > 0 ? (
          <p className="text-[11px] text-paper-faint">
            {learningLanguage === "ca"
              ? `Et ${turnsRemaining(turns) === 1 ? "falta" : "falten"} ${turnsRemaining(turns)} ${turnsRemaining(turns) === 1 ? "intercanvi" : "intercanvis"} perquè aquesta sessió compti`
              : `${turnsRemaining(turns)} more ${turnsRemaining(turns) === 1 ? "exchange" : "exchanges"} to count this session`}
          </p>
        ) : (
          <p className="text-[11px] text-mint">{learningLanguage === "ca" ? "✓ Aquesta sessió comptarà per a la teva ratxa" : "✓ This session counts towards your streak"}</p>
        )}
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
                  <div className="flex justify-end gap-1.5 mb-1">
                    {activeSpeakIdx === i && (
                      <button
                        onClick={handlePauseResume}
                        className="text-paper-faint hover:text-mint transition"
                        aria-label={paused ? (learningLanguage === "ca" ? "Reprendre" : "Resume") : (learningLanguage === "ca" ? "Pausar" : "Pause")}
                      >
                        {paused ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleSpeak(t.content, i)}
                      className="text-paper-faint hover:text-coral transition"
                      aria-label={learningLanguage === "ca" ? "Llegir en veu alta" : "Read aloud"}
                    >
                      <Volume2 size={15} />
                    </button>
                    <button
                      onClick={() => setShadowIdx(shadowIdx === i ? null : i)}
                      className={`transition ${shadowIdx === i ? "text-mint" : "text-paper-faint hover:text-mint"}`}
                      aria-label={learningLanguage === "ca" ? "Repetir aquesta línia" : "Shadow this line"}
                      title={learningLanguage === "ca" ? "Repetir aquesta línia" : "Repeat this line"}
                    >
                      <Mic size={14} />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
                  {shadowIdx === i && (
                    <div className="mt-3">
                      <ShadowingBlock
                        text={t.content.match(/[^.!?]*[.!?]/)?.[0]?.trim() ?? t.content.split(" ").slice(0, 10).join(" ")}
                        lang={voicePrefs.voiceAccent ?? "en-GB"}
                        label={learningLanguage === "ca" ? "Repetir aquesta línia" : "Repeat this line"}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
              )}
            </div>
          </div>
        ))}
        {retryText && !thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 border-gold/30">
              <p className="text-sm text-paper-muted mb-2">
                El coach está con mucha demanda ahora mismo. Prueba de nuevo.
              </p>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition"
                onClick={() => { const t = retryText; setRetryText(null); send(t); }}
              >
                <BrandDots /> Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── Hint pasivo ── */}
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
                  {hintLoading ? (learningLanguage === "ca" ? "Obtenint pista…" : "Getting hint…") : (learningLanguage === "ca" ? "Necessites una pista?" : "Need a hint?")}
                </button>
              )}
            </div>
          </div>
        )}

        {thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-paper-muted">…</div>
          </div>
        )}
      </div>

      <div className="pt-3">
        {listening && voice.interim && (
          <p className="text-center text-sm text-paper-muted italic mb-2">{voice.interim}</p>
        )}
        {voice.error && <p className="text-coral text-xs text-center mb-2">{voice.error}</p>}
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="flex-1 resize-none bg-transparent px-2 py-2 text-paper placeholder:text-paper-faint focus:outline-none max-h-32"
            rows={1}
            placeholder={learningLanguage === "ca" ? "La teva línia… (escriu /end per retroalimentació)" : "Your line… (type /end for feedback)"}
            value={displayValue}
            readOnly={listening}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value.trim()) {
                setShowHint(false);
                setHintText("");
                if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          {speechSupported() && (
            listening ? (
              <button
                onClick={toggleMic}
                className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-coral text-ink-900 font-semibold text-sm transition"
                aria-label={learningLanguage === "ca" ? "Fet — detenir gravació" : "Listo — stop recording"}
              >
                <Square size={15} /> {learningLanguage === "ca" ? "Fet" : "Listo"}
              </button>
            ) : (
              <button
                onClick={toggleMic}
                className="grid h-10 w-10 place-items-center rounded-xl bg-ink-600 text-paper hover:bg-ink-500 transition"
                aria-label={learningLanguage === "ca" ? "Iniciar gravació" : "Start recording"}
              >
                <Mic size={18} />
              </button>
            )
          )}
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            aria-label={learningLanguage === "ca" ? "Envia" : "Send"}
            className="grid h-10 w-10 place-items-center rounded-xl bg-coral text-ink-900 hover:bg-coral-soft disabled:opacity-40 transition"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
