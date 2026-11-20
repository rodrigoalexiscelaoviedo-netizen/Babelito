import { awardSessionXp } from "../lib/xp";
import { PICKER_TOPICS } from "../lib/topics";
import CoachFeedback from "../components/CoachFeedback";
import { splitCoachReply } from "../lib/coachFormat";
import { openingLine } from "../lib/conversationOpeners";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, Send, Square, Loader2, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach, recentTurns, RetryableError } from "../lib/claude";
import { buildConversationPrompt, parseErrors } from "../lib/buildSystemPrompt";
import {
  speechSupported,
  stopSpeech,
} from "../lib/speech";
import LiveCall from "../components/LiveCall";
import { liveSupported } from "../lib/liveSession";
import { geminiToolsAvailable } from "../lib/geminiTools";
import { useSpeechCapture } from "../lib/useSpeechCapture";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import type { ChatTurn, DetectedError } from "../lib/types";
import VoiceOrb from "../components/VoiceOrb";
import { generateReport, type SessionReport } from "../lib/sessionReport";
import { MIN_USER_TURNS, countUserTurns, turnsRemaining } from "../lib/practice";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { BrandDots } from "../components/Loader";
import { requestHint } from "../lib/hints";
import { useResumableSession } from "../lib/useResumableSession";
import CoachMessage from "../components/conversation/CoachMessage";
import ReportPanel from "../components/conversation/ReportPanel";

export default function Conversation() {
  const { profile } = useAuth();
  const location = useLocation();
  const voicePrefs = useVoicePrefs();

  const learningLanguage = profile?.learning_language || "en";

  const TOPICS = PICKER_TOPICS[learningLanguage === "ca" ? "ca" : "en"];

  // Support pre-seeded topic from Dashboard daily lesson
  const locationTopic = (location.state as { topic?: string } | null)?.topic ?? null;
  const [topic, setTopic] = useState<string | null>(locationTopic);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportCounted, setReportCounted] = useState(true);
  const [reportError, setReportError] = useState("");
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  // Conversación abierta que se puede retomar (turnos guardados en sessions.messages).
  const { session: resumable, dismiss: dismissResumable } = useResumableSession(profile?.id);

  function resumeSession() {
    if (!resumable) return;
    sessionIdRef.current = resumable.id;
    setSessionId(resumable.id);
    setTopic(resumable.topic);
    setTurns(resumable.messages);
    dismissResumable();
  }

  // Si se llegó desde la tarjeta de Inicio ("Continue your conversation"), se retoma sola.
  const wantsResume = (location.state as { resume?: boolean } | null)?.resume === true;
  useEffect(() => {
    if (wantsResume && resumable && turns.length === 0) resumeSession();
    // resumeSession depende de estado que cambia en cada render; solo debe correr al cargar la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsResume, resumable]);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<string>("");
  // El prompt se arma de forma asíncrona (espera el historial de errores): al enviar se espera.
  const promptReadyRef = useRef<Promise<void>>(Promise.resolve());
  const sessionIdRef = useRef<string | null>(null);
  const creatingSessionRef = useRef<Promise<string | null> | null>(null);

  const voice = useSpeechCapture(
    profile?.learning_language || "en",
    profile?.english_variant ?? undefined,
    { mode: "turn" }
  );
  const listening = voice.isRecording;

  // El hook es la única fuente de verdad mientras se graba: lo que se ve es
  // el texto ya escrito + lo confirmado + el borrador en vivo. Al terminar el
  // turno se hace UN solo commit a `input`, que vuelve a ser editable.
  const displayValue = listening
    ? [input, voice.finalText, voice.interim].filter((s) => s.trim()).join(" ")
    : input;

  // ── Hint pasivo ──────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;
    promptReadyRef.current = (async () => {
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
        learningLanguage: profile?.learning_language || "en",
      });
    })();
  }, [profile, topic]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  const lastRole = turns[turns.length - 1]?.role;
  const lastCoachIndex = turns.map((t) => t.role).lastIndexOf("assistant");

  // ── Live (voz a voz) ───────────────────────────────────────────────────────
  // Única forma de llamada: el motor Gemini Live con modos (ver docs/DISENO-live-unificado.md).
  // Se ofrece solo si el servidor la tiene y el navegador puede.
  const [liveOn, setLiveOn] = useState(false);
  const [liveReady, setLiveReady] = useState(false);

  // La llamada en vivo (beta) solo se ofrece si el servidor la tiene y el navegador puede.
  useEffect(() => {
    if (learningLanguage === "ca" || !liveSupported()) return;
    let cancelled = false;
    void geminiToolsAvailable().then((ok) => {
      if (!cancelled) setLiveReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [learningLanguage]);

  // Cortar la voz al salir de la pantalla.
  useEffect(() => () => stopSpeech(), []);

  // Arrancar timer de hint cuando el coach termina de responder
  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setShowHint(false);
    setHintText("");
    if (!thinking && lastRole === "assistant") {
      hintTimerRef.current = setTimeout(() => setShowHint(true), 11000);
    }
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [thinking, lastRole, turns.length]);

  // Ocultar hint cuando el usuario empieza a escribir o a grabar
  useEffect(() => {
    if (input.trim() || listening) {
      setShowHint(false);
      setHintText("");
      if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    }
  }, [input, listening]);

  // El guard vive en un ref, no en el estado: setSessionId es asíncrono y dos
  // envíos rápidos alcanzaban a insertar dos filas de sesión.
  async function ensureSession(): Promise<string | null> {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (creatingSessionRef.current) return creatingSessionRef.current;
    if (!profile) return null;

    creatingSessionRef.current = (async () => {
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: profile.id, session_type: "conversation", topic })
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

  async function send(text: string) {
    if (!text.trim() || !profile) return;
    const userTurn: ChatTurn = { role: "user", content: text.trim() };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setInput("");
    setThinking(true);

    try {
      if (!systemRef.current) await promptReadyRef.current;
      const raw = await askCoach({ system: systemRef.current, messages: recentTurns(nextTurns) });
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

  // El coach abre la conversación: pregunta concreta sobre el tema, sin llamar a la IA
  // (instantáneo) y sin fingir un primer mensaje del usuario.
  function startConversation() {
    if (!profile || turns.length > 0) return;
    setTurns([
      {
        role: "assistant",
        content: openingLine({
          lang: learningLanguage === "ca" ? "ca" : "en",
          name: profile.name,
          topic,
          level: profile.current_level,
        }),
      },
    ]);
  }

  async function handleEndSession() {
    if (!profile || countUserTurns(turns) === 0) return;
    setGeneratingReport(true);
    setReportError("");
    try {
      const sid = sessionIdRef.current ?? sessionId;
      const r = await generateReport(profile.id, sid, "conversation", turns, profile.learning_language || "en", profile.current_level);
      const userTurns = countUserTurns(turns);
      const counts = userTurns >= MIN_USER_TURNS;

      // La sesión solo se registra si alcanzó el mínimo. El resultado se
      // informa en pantalla — nunca en silencio.
      if (sid && counts) {
        void awardSessionXp(profile.id, sid, "conversation", userTurns, Math.round((Date.now() - startedAt) / 1000)).then(setXpEarned);
        const { error } = await supabase
          .from("sessions")
          .update({
            completed: true,
            turn_count: userTurns,
            ended_at: new Date().toISOString(),
          })
          .eq("id", sid);
        if (error) {
          setReportError(`No se pudo registrar la sesión: ${error.message}`);
        }
      }

      setReportCounted(counts);
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
    const last = [...turns].reverse().find((t) => t.role === "assistant")?.content ?? "";
    setHintLoading(true);
    try {
      setHintText(
        await requestHint({
          lang: learningLanguage === "ca" ? "ca" : "en",
          kind: "conversation",
          level: profile.current_level,
          lastCoachMessage: last,
        })
      );
    } finally {
      setHintLoading(false);
    }
  }

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

  if (report) {
    return (
      <ReportPanel
        report={report}
        counted={reportCounted}
        error={reportError}
        onClose={() => setReport(null)}
        learningLanguage={learningLanguage}
        xpEarned={xpEarned}
        userId={profile?.id}
      />
    );
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
        {resumable && learningLanguage !== "ca" && (
          <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-medium">Continue your last conversation?</p>
              <p className="text-xs text-paper-muted">{resumable.messages.length} messages saved · not finished yet</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-coral text-sm px-4 py-2" onClick={resumeSession}>Continue</button>
              <button className="btn-ghost text-sm px-4 py-2" onClick={() => dismissResumable()}>Start new</button>
            </div>
          </div>
        )}
        <p className="eyebrow mb-2">
          {learningLanguage === "ca" ? "Conversa en directe" : "Live conversation"}
        </p>
        <h1 className="page-title mb-2">
          {learningLanguage === "ca" ? "De quin tema volem parlar?" : "What should we talk about?"}
        </h1>
        <p className="text-paper-muted mb-8">
          {learningLanguage === "ca"
            ? `Tria un tema o simplement comença. El teu coach s'adapta al teu ${profile?.current_level ?? "nivell"} i observa els errors que tens tendència a cometre.`
            : `Pick a topic or just start. Your coach adapts to your ${profile?.current_level ?? "level"} and watches the mistakes you tend to make.`}
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
              <span className="ml-2 text-xs text-coral font-mono">
                · {learningLanguage === "ca" ? "tema d'avui" : "today's topic"}
              </span>
            </button>
          )}
        </div>
        <button
          className="btn-coral w-full"
          onClick={startConversation}
        >
          {learningLanguage === "ca" ? "Comença a parlar →" : "Start talking →"}
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
        <div className="flex items-center gap-4">
        {learningLanguage !== "ca" && liveReady && (
          <button
            onClick={() => setLiveOn(true)}
            disabled={thinking || generatingReport}
            className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition disabled:opacity-40"
            aria-label="Start live call (beta)"
          >
            <Phone size={13} /> Live <span className="rounded bg-gold/20 px-1 text-[9px] uppercase">beta</span>
          </button>
        )}
        <button
          onClick={handleEndSession}
          disabled={generatingReport || countUserTurns(turns) === 0}
          className="flex items-center gap-1.5 text-xs text-paper-muted hover:text-coral transition disabled:opacity-40"
        >
          {generatingReport ? (
            <span className="flex items-center gap-2">
              <BrandDots />
              {learningLanguage === "ca" ? "Generant informe…" : "Generating report…"}
            </span>
          ) : (
            learningLanguage === "ca" ? "Finalitza i veu l'informe →" : "Finish & see report →"
          )}
        </button>
        </div>
      </div>

      {/* Estado real de registro — el usuario siempre sabe si esto va a contar */}
      <div className="mb-2 text-right">
        {turnsRemaining(turns) > 0 ? (
          <p className="text-[11px] text-paper-faint">
            {learningLanguage === "ca"
              ? `Te ${turnsRemaining(turns) === 1 ? "falta" : "falten"} ${turnsRemaining(turns)} ${turnsRemaining(turns) === 1 ? "intercanvi" : "intercanvis"} perquè aquesta sessió compti`
              : `${turnsRemaining(turns)} more ${turnsRemaining(turns) === 1 ? "exchange" : "exchanges"} to count this session`}
          </p>
        ) : (
          <p className="text-[11px] text-mint">
            {learningLanguage === "ca"
              ? "✓ Aquesta sessió comptarà per a la teva racha"
              : "✓ This session counts towards your streak"}
          </p>
        )}
      </div>
      {reportError && <p className="text-coral text-xs mb-2">{reportError}</p>}

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
        {turns.map((t, i) => {
          if (t.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div data-role="user" className="max-w-[85%] rounded-xl2 bg-coral px-4 py-3 text-ink-900">
                  {t.content}
                </div>
              </div>
            );
          }
          const reply = splitCoachReply(t.content);
          const isLastCoach = i === lastCoachIndex;
          return (
            <div key={i} className="flex flex-col items-start">
              <div data-role="assistant" className="card max-w-[85%] whitespace-pre-wrap rounded-xl2 px-4 py-3 leading-relaxed">
                <CoachMessage
                  text={t.content}
                  variant={profile?.english_variant ?? "British"}
                  voicePrefs={voicePrefs}
                />
              </div>
              <CoachFeedback
                sections={reply.feedback}
                defaultOpen={isLastCoach}
                language={learningLanguage}
              />
            </div>
          );
        })}
        {retryText && !thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 border-gold/30 max-w-[85%]">
              <p className="text-sm text-paper-muted mb-2">
                {learningLanguage === "ca"
                  ? "El coach té molta demanda ara mateix. Prova de nou."
                  : "El coach está con mucha demanda ahora mismo. Prueba de nuevo."}
              </p>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 transition"
                onClick={() => { const t = retryText; setRetryText(null); send(t); }}
              >
                <Loader2 size={12} /> {learningLanguage === "ca" ? "Reintenta" : "Reintentar"}
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
                  {hintLoading
                    ? (learningLanguage === "ca" ? "Obtenint pista…" : "Getting hint…")
                    : (learningLanguage === "ca" ? "Necessites una pista?" : "Need a hint?")}
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
            {voice.interim && (
              <p className="text-center text-sm text-paper-muted italic">{voice.interim}</p>
            )}
          </div>
        )}
        {voice.error && <p className="text-coral text-xs text-center mb-2">{voice.error}</p>}
        <div className="card flex items-end gap-2 p-2">
          <textarea
            aria-label={learningLanguage === "ca" ? "Missatge" : "Message"}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-paper placeholder:text-paper-faint focus:outline-none max-h-32"
            rows={1}
            placeholder={learningLanguage === "ca"
              ? "Escriu en català… o toca el mic"
              : "Type in English… or tap the mic"}
            value={displayValue}
            readOnly={listening}
            onChange={(e) => setInput(e.target.value)}
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
                aria-label={learningLanguage === "ca" ? "Fet — stop recording" : "Listo — stop recording"}
              >
                <Square size={15} /> {learningLanguage === "ca" ? "Fet" : "Listo"}
              </button>
            ) : (
              <button
                onClick={toggleMic}
                className="grid h-10 w-10 place-items-center rounded-xl bg-ink-600 text-paper hover:bg-ink-500 transition"
                aria-label="Start recording"
              >
                <Mic size={18} />
              </button>
            )
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

      {liveOn && profile && (
        <LiveCall
          userId={profile.id}
          level={profile.current_level ?? "A2"}
          name={profile.name ?? ""}
          topic={topic}
          onClose={() => setLiveOn(false)}
        />
      )}

    </div>
  );
}

