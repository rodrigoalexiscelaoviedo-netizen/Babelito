import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, Volume2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { applyDiagnosticLevel } from "../lib/levelChange";
import { useAuth } from "../context/AuthContext";
import { speak } from "../lib/speech";
import { TARGET_TTS_LANG } from "../lib/useVoicePrefs";
import { BrandDots } from "../components/Loader";
import { LiveSession, liveSupported } from "../lib/liveSession";
import {
  DONT_KNOW,
  LEVELS,
  MAX_ITEMS,
  combineWithOral,
  estimateWrittenLevel,
  initialState,
  isDone,
  nextItem,
  recordAnswer,
  type PlacementState,
} from "../lib/placement";
import { bankFor } from "../lib/placementBank";
import { EXAMINER_MAX_SECONDS, type ExaminerRating } from "../lib/placementExaminer";
import type { DiagnosticAnswer, Level } from "../lib/types";

type Phase = "written" | "oral_intro" | "oral_call" | "evaluating" | "done";

const MANUAL_LEVELS: Record<"en" | "ca", { key: Level; label: string }[]> = {
  en: [
    { key: "A1", label: "A1 · Just starting" },
    { key: "A2", label: "A2 · Basic phrases" },
    { key: "B1", label: "B1 · I get by" },
    { key: "B2", label: "B2 · Comfortable" },
    { key: "C1", label: "C1 · Advanced" },
  ],
  ca: [
    { key: "A1", label: "A1 · Acabo de començar" },
    { key: "A2", label: "A2 · Frases bàsiques" },
    { key: "B1", label: "B1 · Em defenc" },
    { key: "B2", label: "B2 · Còmode" },
    { key: "C1", label: "C1 · Avançat" },
  ],
};

const CRITERIA: Array<{ key: keyof Pick<ExaminerRating, "range" | "accuracy" | "vocabulary" | "fluency" | "coherence">; en: string; ca: string }> = [
  { key: "range", en: "Range", ca: "Abast" },
  { key: "accuracy", en: "Accuracy", ca: "Precisió" },
  { key: "vocabulary", en: "Vocabulary", ca: "Vocabulari" },
  { key: "fluency", en: "Fluency", ca: "Fluïdesa" },
  { key: "coherence", en: "Coherence", ca: "Coherència" },
];

/** Nombre corto de cada habilidad que aparece en la etiqueta de la pregunta. */
const SKILL_TAG: Record<"en" | "ca", Record<string, string>> = {
  en: { grammar: "grammar", vocab: "vocabulary", usage: "usage", listening: "listening", visual: "visual" },
  ca: { grammar: "gramàtica", vocab: "vocabulari", usage: "ús", listening: "escolta", visual: "visual" },
};

export default function Diagnostic() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const isCatalan = (profile?.learning_language || "en") === "ca";
  const lang: "en" | "ca" = isCatalan ? "ca" : "en";
  const bank = useMemo(() => bankFor(lang), [lang]);
  const ttsLang = isCatalan ? TARGET_TTS_LANG.ca : TARGET_TTS_LANG.en;

  // ── Parte escrita y de escucha (adaptativa) ────────────────────────────────
  const [phase, setPhase] = useState<Phase>("written");
  const [state, setState] = useState<PlacementState>(initialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickingLevel, setPickingLevel] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const item = useMemo(() => (phase === "written" ? nextItem(state, bank) : null), [state, bank, phase]);

  // ── Resultados ─────────────────────────────────────────────────────────────
  const writtenRef = useRef<Level>("B1");
  const diagIdRef = useRef<string | null>(null);
  const [written, setWritten] = useState<Level>("B1");
  const [oralRating, setOralRating] = useState<ExaminerRating | null>(null);
  const [finalLevel, setFinalLevel] = useState<Level | null>(null);

  // ── Examinador por voz ─────────────────────────────────────────────────────
  const sessionRef = useRef<LiveSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratingRef = useRef<ExaminerRating | null>(null);
  const endedRef = useRef(false);
  const [callState, setCallState] = useState<"connecting" | "live" | "error" | "ended">("connecting");
  const [callError, setCallError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ who: "examiner" | "learner"; text: string }>>([]);
  // Espejo de la transcripción para leerla al cerrar la llamada (sin estado obsoleto).
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Escuchar: lee el audio del ítem una vez al mostrarlo.
  useEffect(() => {
    if (item?.format === "listen" && item.audio) speak(item.audio, ttsLang);
  }, [item?.id, item?.format, item?.audio, ttsLang]);

  // Al salir de la pantalla, corta la llamada, el tope de tiempo y libera el micrófono.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sessionRef.current?.stop();
    },
    []
  );

  function choose(optionIndex: number) {
    if (!item || selected !== null || busy) return;
    setSelected(optionIndex);
    const next = recordAnswer(state, item, optionIndex);
    setTimeout(() => {
      setSelected(null);
      if (isDone(next)) void finishWritten(next);
      else setState(next);
    }, 380);
  }

  async function finishWritten(final: PlacementState) {
    setBusy(true);
    const level = estimateWrittenLevel(final);
    writtenRef.current = level;
    setWritten(level);

    const answers: DiagnosticAnswer[] = final.history.map((h) => ({
      question_id: bank.findIndex((i) => i.id === h.itemId) + 1,
      chosen: h.chosen,
      correct: h.correct,
      level: LEVELS[h.levelIdx],
    }));
    if (session) {
      const { data } = await supabase
        .from("diagnostics")
        .insert({
          user_id: session.user.id,
          answers,
          raw_score: answers.filter((a) => a.correct).length,
          estimated_level: level,
          completed: false,
        })
        .select("id")
        .single();
      diagIdRef.current = data?.id ?? null;
    }
    setBusy(false);

    if (liveSupported()) setPhase("oral_intro");
    else await finishAll(null, []);
  }

  // ── Llamada del examinador ─────────────────────────────────────────────────

  function startCall() {
    endedRef.current = false;
    ratingRef.current = null;
    setCallError(null);
    setCallState("connecting");
    setTranscript([]);
    setPhase("oral_call");
    const s = new LiveSession(
      {
        onState: (st, detail) => {
          if (st === "error") setCallError(detail ?? null);
          setCallState(st);
        },
        onHeard: (text) => setTranscript((t) => [...t, { who: "learner", text }]),
        onSaid: (text) => setTranscript((t) => [...t, { who: "examiner", text }]),
        onSpeaking: setSpeaking,
        onRating: (r) => {
          ratingRef.current = r;
          void endCall();
        },
      },
      { level: "", name: "", topic: null },
      { lang }
    );
    sessionRef.current = s;
    timerRef.current = setTimeout(() => void endCall(), EXAMINER_MAX_SECONDS * 1000);
    void s.start();
  }

  async function endCall() {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    sessionRef.current?.stop();
    sessionRef.current = null;
    await finishAll(ratingRef.current, transcriptRef.current);
  }

  function skipOral() {
    void finishAll(null, []);
  }

  // ── Cierre: combina escrito y oral, guarda y aplica el nivel ───────────────

  async function finishAll(rating: ExaminerRating | null, log: Array<{ who: string; text: string }>) {
    setBusy(true);
    setPhase("evaluating");
    setOralRating(rating);

    const oral = rating?.cefr ?? null;
    const final = combineWithOral(writtenRef.current, oral);
    setFinalLevel(final);

    if (session) {
      if (diagIdRef.current) {
        await supabase
          .from("diagnostics")
          .update({
            oral_level: oral,
            oral_open_level: oral,
            oral_open_transcript: rating || log.length ? { mode: "examiner", rating, transcript: log } : null,
            final_level: final,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", diagIdRef.current);
      }
      await applyDiagnosticLevel(session.user.id, final);
      await refreshProfile();
    }
    setBusy(false);
    setPhase("done");
  }

  function handleExit() {
    if (phase === "written" && state.history.length === 0) navigate("/");
    else setConfirmExit(true);
  }

  async function finishWithLevel(level: Level) {
    if (!session) return;
    setBusy(true);
    await applyDiagnosticLevel(session.user.id, level);
    await refreshProfile();
    setBusy(false);
    navigate("/", { replace: true });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const exitButton =
    phase !== "done" && phase !== "evaluating" ? (
      <button
        onClick={handleExit}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-ink-700/80 hover:bg-ink-600 text-paper-muted hover:text-paper transition"
        aria-label={isCatalan ? "Surt del test" : "Leave the test"}
      >
        <X size={18} />
      </button>
    ) : null;

  const exitOverlay = confirmExit ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-6">
      <div className="card w-full max-w-sm p-6 text-center animate-fade-up" role="dialog" aria-modal="true">
        <p className="font-display font-bold text-lg mb-2">
          {isCatalan ? "Vols sortir del test?" : "Leave the test?"}
        </p>
        <p className="text-sm text-paper-muted mb-6">
          {isCatalan
            ? "Perdràs el progrés d'aquesta sessió. Pots repetir-lo quan vulguis des de Perfil."
            : "You'll lose this session's progress. You can retake it anytime from Profile."}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmExit(false)} className="flex-1 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-medium transition">
            {isCatalan ? "Continuar" : "Keep going"}
          </button>
          <button onClick={() => navigate("/")} className="flex-1 py-2.5 rounded-xl bg-coral/20 hover:bg-coral/30 text-coral font-medium transition">
            {isCatalan ? "Sortir" : "Leave"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (pickingLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          <p className="eyebrow mb-3">{isCatalan ? "Tria el teu nivell" : "Choose your level"}</p>
          <h1 className="font-display text-2xl font-bold mb-2">
            {isCatalan ? "Amb quin nivell comences?" : "Where are you starting from?"}
          </h1>
          <p className="text-paper-muted mb-6 text-sm">
            {isCatalan
              ? "S'anirà ajustant a mesura que practiquis. Pots repetir la prova en qualsevol moment des de Perfil."
              : "It'll adjust as you practise. You can retake the test anytime from Profile."}
          </p>
          <div className="flex flex-col gap-2">
            {MANUAL_LEVELS[lang].map((l) => (
              <button key={l.key} onClick={() => void finishWithLevel(l.key)} disabled={busy} className="card px-4 py-3.5 text-left font-medium hover:border-coral transition disabled:opacity-50">
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={() => setPickingLevel(false)} disabled={busy} className="w-full mt-4 text-xs text-paper-faint hover:text-paper transition text-center">
            {isCatalan ? "← Tornar al test" : "← Back to the test"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-up">
          <BrandDots size="md" />
          <p className="mt-4 text-paper-muted">{isCatalan ? "Calculant el teu nivell…" : "Working out your level…"}</p>
        </div>
      </div>
    );
  }

  if (phase === "done" && finalLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-up">
          <p className="eyebrow mb-3">{isCatalan ? "Avaluació de nivell" : "Level assessment"}</p>
          <div className="font-display text-7xl font-extrabold text-coral mb-2">{finalLevel}</div>
          <p className="text-paper-muted mb-6">{isCatalan ? "El teu nivell inicial a Babelito." : "Your starting level in Babelito."}</p>

          <div className="card p-5 mb-6 text-left space-y-3">
            <p className="text-xs text-paper-faint uppercase tracking-widest font-mono mb-1">{isCatalan ? "Desglossament" : "Breakdown"}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-paper-muted">{isCatalan ? "Prova escrita i de escolta" : "Written and listening"}</span>
              <span className="font-display font-bold text-coral">{written}</span>
            </div>
            {oralRating ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-paper-muted">{isCatalan ? "Conversa amb l'examinador" : "Speaking with the examiner"}</span>
                  <span className="font-display font-bold text-mint">{oralRating.cefr}</span>
                </div>
                <ul className="space-y-1.5 pt-1">
                  {CRITERIA.map((c) => (
                    <li key={c.key} className="flex items-center gap-3 text-xs text-paper-muted">
                      <span className="w-24">{isCatalan ? c.ca : c.en}</span>
                      <span className="flex-1 h-1.5 rounded-full bg-ink-600 overflow-hidden" aria-hidden="true">
                        <span className="block h-full bg-mint" style={{ width: `${(oralRating[c.key] / 5) * 100}%` }} />
                      </span>
                      <span className="font-mono w-8 text-right">{oralRating[c.key]}/5</span>
                    </li>
                  ))}
                </ul>
                {oralRating.evidence && (
                  <p className="text-xs text-paper-faint italic border-t border-ink-600 pt-3">
                    {isCatalan ? "Frase de referència: " : "Evidence: "}“{oralRating.evidence}”
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-paper-faint border-t border-ink-600 pt-3">
                {isCatalan
                  ? "Sense parte oral: el nivell surt només de la prova escrita i de escolta. Pots fer la conversa més tard des de Perfil."
                  : "No speaking part: the level comes only from the written and listening test. You can do the conversation later from Profile."}
              </p>
            )}
          </div>

          <p className="text-paper-muted text-sm mb-8">
            {oralRating
              ? isCatalan
                ? "La conversa pot pujar o baixar el teu nivell escrit un escaló com a màxim. Les converses a partir d'ara s'ajusten a aquest nivell."
                : "The conversation can move your written level up or down one step at most. Conversations from now on are tuned to this level."
              : isCatalan
                ? "Les converses a partir d'ara s'ajusten a aquest nivell i pujarà mentre millores."
                : "Conversations from now on are tuned to this level, and it'll move up as you improve."}
          </p>
          <button className="btn-coral w-full" onClick={() => navigate("/", { replace: true })}>
            {isCatalan ? "Entra a Babelito →" : "Enter Babelito →"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "oral_intro") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-up">
          <p className="eyebrow mb-3">{isCatalan ? "Part oral" : "Speaking part"}</p>
          <h1 className="font-display text-2xl font-bold mb-3">
            {isCatalan ? "Una conversa de cinc minuts" : "A five-minute conversation"}
          </h1>
          <p className="text-paper-muted text-sm mb-6">
            {isCatalan
              ? "Un examinador de veu et farà preguntes i anirà ajustant la dificultat. Parla amb naturalitat: no hi ha respostes bones ni dolentes. Necessitarem el micròfon."
              : "A voice examiner will ask you questions and adjust the difficulty as you go. Speak naturally: there are no right or wrong answers. We'll need your microphone."}
          </p>
          <button onClick={startCall} className="btn-coral w-full flex items-center justify-center gap-2">
            <Mic size={16} /> {isCatalan ? "Començar la conversa" : "Start the conversation"}
          </button>
          <button onClick={skipOral} disabled={busy} className="w-full mt-4 text-xs text-paper-faint hover:text-paper transition text-center">
            {isCatalan ? "Saltar la part oral" : "Skip the speaking part"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "oral_call") {
    const statusText =
      callState === "connecting"
        ? isCatalan ? "Connectant…" : "Connecting…"
        : callState === "error"
          ? isCatalan ? "No s'ha pogut connectar" : "Couldn't connect"
          : speaking
            ? isCatalan ? "L'examinador parla…" : "The examiner is speaking…"
            : isCatalan ? "Et escolta…" : "Listening to you…";
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {exitButton}
        {exitOverlay}
        <div className="w-full max-w-lg animate-fade-up">
          <p className="eyebrow mb-3">{isCatalan ? "Conversa amb l'examinador" : "Conversation with the examiner"}</p>
          <div className="card p-5 mb-4 min-h-[140px]" role="status" aria-live="polite">
            <p className="text-sm font-medium mb-3">{statusText}</p>
            {callState === "error" && (
              <p className="text-xs text-coral mb-3">
                {callError ?? (isCatalan ? "Revisa la connexió i el micròfon." : "Check your connection and microphone.")}
              </p>
            )}
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {transcript.map((line, i) => (
                <p key={i} className={`text-sm ${line.who === "examiner" ? "text-paper-muted" : "text-paper"}`}>
                  <span className="font-mono text-xs text-paper-faint mr-2">{line.who === "examiner" ? "EX" : "TU"}</span>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            {callState === "error" ? (
              <>
                <button onClick={startCall} className="flex-1 py-3 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-semibold transition">
                  {isCatalan ? "Torna-ho a provar" : "Try again"}
                </button>
                <button onClick={skipOral} className="flex-1 py-3 rounded-xl bg-coral/20 text-coral font-semibold transition">
                  {isCatalan ? "Saltar" : "Skip"}
                </button>
              </>
            ) : (
              <button onClick={() => void endCall()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-coral text-ink-900 font-semibold transition">
                <Square size={16} /> {isCatalan ? "Acabar" : "End"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Parte escrita y de escucha
  if (!item) return null;
  const shown = state.history.length + 1;
  const ttsLabel = isCatalan ? "Escolta de nou" : "Hear it again";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {exitButton}
      {exitOverlay}
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex gap-1 mb-8" aria-hidden="true">
          {Array.from({ length: MAX_ITEMS }, (_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < shown - 1 ? "bg-coral" : "bg-ink-600"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="eyebrow">{isCatalan ? "Pregunta" : "Question"} {shown}</p>
          <span className="font-mono text-xs text-paper-faint">
            {item.format === "listen" ? (isCatalan ? "escolta" : "listening") : item.format === "visual" ? "visual" : SKILL_TAG[isCatalan ? "ca" : "en"][item.skill]}
          </span>
        </div>

        {item.format === "listen" && (
          <div className="card p-6 mb-6 flex items-center gap-4">
            <button
              onClick={() => item.audio && speak(item.audio, ttsLang)}
              className="shrink-0 w-12 h-12 rounded-full bg-coral text-ink-900 flex items-center justify-center hover:opacity-90 transition"
              aria-label={ttsLabel}
            >
              <Volume2 size={20} />
            </button>
            <p className="font-display text-lg font-bold leading-snug">{item.prompt}</p>
          </div>
        )}

        {item.format === "visual" && (
          <div className="card p-6 mb-6 text-center">
            <div className="text-7xl mb-3" role="img" aria-label={isCatalan ? "Imatge de la pregunta" : "Question picture"}>{item.visual}</div>
            <p className="font-display text-lg font-bold">{item.prompt}</p>
          </div>
        )}

        {(item.format === "choice" || item.format === "fix") && (
          <h1 className="font-display text-2xl font-bold mb-7 leading-snug">{item.prompt}</h1>
        )}

        <div className="flex flex-col gap-3">
          {item.options.map((opt, i) => {
            const isPicked = selected === i;
            return (
              <button
                key={`${item.id}-${i}`}
                disabled={selected !== null || busy}
                onClick={() => choose(i)}
                className={`card px-4 py-3.5 text-left font-medium transition ${isPicked ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"}`}
              >
                <span className="font-mono text-xs text-paper-faint mr-3">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            );
          })}
        </div>

        <button
          disabled={selected !== null || busy}
          onClick={() => choose(DONT_KNOW)}
          className="mt-3 w-full rounded-xl border border-dashed border-ink-500 px-4 py-3 text-sm text-paper-muted transition hover:border-ink-400 hover:text-paper disabled:opacity-50"
        >
          {isCatalan ? "No ho sé" : "I don't know"}
        </button>

        <button onClick={() => setPickingLevel(true)} disabled={busy} className="w-full mt-6 text-xs text-paper-faint hover:text-paper transition text-center">
          {isCatalan ? "Prefereixo triar el meu nivell a mà" : "I'd rather pick my level myself"}
        </button>
      </div>
    </div>
  );
}
