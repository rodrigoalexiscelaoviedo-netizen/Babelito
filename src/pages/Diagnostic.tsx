import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, Volume2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { DIAGNOSTIC, estimateLevel } from "../lib/diagnosticQuestions";
import type { Level, DiagnosticAnswer } from "../lib/types";
import { speechSupported, speak } from "../lib/speech";
import { useSingleUtterance } from "../lib/useSingleUtterance";
import { BrandDots } from "../components/Loader";
import {
  READING_SENTENCES,
  generateOpenQuestion,
  evaluateReading,
  evaluateOpenResponse,
  minCefr,
} from "../lib/oralDiagnostic";

type Phase = "text" | "oral_reading" | "oral_open" | "evaluating" | "done";

// ── Voice waveform — shown while SpeechRecognition is active ────────────────
function VoiceWave() {
  const delays = [0, 0.15, 0.05, 0.2, 0.1];
  return (
    <div className="flex items-end gap-0.5" style={{ height: 20 }}>
      {delays.map((d, i) => (
        <div
          key={i}
          className="voice-bar w-1.5 rounded-full bg-coral"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

// ── Human-readable voice error messages ────────────────────────────────────
function voiceErrorMsg(code: string | null): string {
  if (!code) return "";
  if (code === "not-allowed")  return "Microphone access denied — check your browser permissions.";
  if (code === "no-speech")    return "No speech detected.";
  if (code === "network")      return "Voice service unavailable (network error).";
  if (code === "audio-capture") return "No microphone found or it's already in use.";
  return `Voice error: ${code}.`;
}

export default function Diagnostic() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const voiceRec = useSingleUtterance("en-GB");

  // ── Text phase ──────────────────────────────────────────────────────────────
  const [idx, setIdx]         = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  // ── Phase control ───────────────────────────────────────────────────────────
  const [phase, setPhase]             = useState<Phase>("text");
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [textLevel, setTextLevel]     = useState<Level>("B1");
  const [busy, setBusy]               = useState(false);

  // ── Oral reading (Part B) ───────────────────────────────────────────────────
  const [readingIdx, setReadingIdx]         = useState(0);
  const [readingTranscripts, setReadingTranscripts] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript]   = useState("");
  const [hasRecorded, setHasRecorded]       = useState(false);
  const [voiceErrorB, setVoiceErrorB]       = useState<string | null>(null);

  // ── Oral open (Part C) ──────────────────────────────────────────────────────
  const [openQuestion, setOpenQuestion]   = useState("");
  const [openTranscript, setOpenTranscript] = useState("");
  const [hasAnswered, setHasAnswered]     = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [voiceErrorC, setVoiceErrorC]     = useState<string | null>(null);

  // ── Results ─────────────────────────────────────────────────────────────────
  const [oralReadingLevel, setOralReadingLevel] = useState<Level | null>(null);
  const [oralOpenLevel, setOralOpenLevel]       = useState<Level | null>(null);
  const [finalLevel, setFinalLevel]             = useState<Level | null>(null);

  // ── Exit confirmation ────────────────────────────────────────────────────────
  const [confirmExit, setConfirmExit] = useState(false);

  function handleExit() {
    if (phase !== "text" || answers.length > 0) {
      setConfirmExit(true);
    } else {
      navigate("/");
    }
  }

  const q      = DIAGNOSTIC[idx];
  const isLast = idx === DIAGNOSTIC.length - 1;

  // Load open question when entering Part C
  useEffect(() => {
    if (phase !== "oral_open") return;
    setLoadingQuestion(true);
    const interests = (profile?.profile_json?.interests as string) ?? "";
    generateOpenQuestion(interests)
      .then((qText) => { setOpenQuestion(qText); setLoadingQuestion(false); })
      .catch(() => {
        setOpenQuestion("Tell me about something you enjoy doing in your free time.");
        setLoadingQuestion(false);
      });
  }, [phase, profile]);

  // ── Text phase ──────────────────────────────────────────────────────────────

  async function choose(optionIndex: number) {
    setSelected(optionIndex);
    const ans: DiagnosticAnswer = {
      question_id: q.id,
      chosen: optionIndex,
      correct: optionIndex === q.answer,
      level: q.level,
    };
    const next = [...answers, ans];
    setTimeout(async () => {
      setSelected(null);
      if (isLast) {
        await finishText(next);
      } else {
        setAnswers(next);
        setIdx((i) => i + 1);
      }
    }, 380);
  }

  async function finishText(allAnswers: DiagnosticAnswer[]) {
    setBusy(true);
    const buckets: Record<Level, { correct: number; total: number }> = {
      A1: { correct: 0, total: 0 },
      A2: { correct: 0, total: 0 },
      B1: { correct: 0, total: 0 },
      B2: { correct: 0, total: 0 },
      C1: { correct: 0, total: 0 },
    };
    allAnswers.forEach((a) => {
      buckets[a.level].total++;
      if (a.correct) buckets[a.level].correct++;
    });
    const level    = estimateLevel(buckets);
    const rawScore = allAnswers.filter((a) => a.correct).length;
    setTextLevel(level);

    let diagId: string | null = null;
    if (session) {
      const { data } = await supabase
        .from("diagnostics")
        .insert({
          user_id: session.user.id,
          answers: allAnswers,
          raw_score: rawScore,
          estimated_level: level,
          completed: false,
        })
        .select("id")
        .single();
      diagId = data?.id ?? null;
      setDiagnosticId(diagId);
    }

    setBusy(false);

    if (speechSupported()) {
      setPhase("oral_reading");
    } else {
      await finishAll(level, diagId, [], "", true);
    }
  }

  // ── Oral reading (Part B) ───────────────────────────────────────────────────

  function handleStartReading() {
    setCurrentTranscript("");
    setHasRecorded(false);
    setVoiceErrorB(null);
    voiceRec.start((text, errorCode) => {
      setCurrentTranscript(text);
      setHasRecorded(true);
      setVoiceErrorB(errorCode ?? null);
    });
  }

  function handleStopReading() {
    voiceRec.stop();
  }

  function handleNextSentence() {
    const allTranscripts = [...readingTranscripts, currentTranscript];
    setReadingTranscripts(allTranscripts);
    setCurrentTranscript("");
    setHasRecorded(false);
    setVoiceErrorB(null);

    if (readingIdx + 1 >= READING_SENTENCES.length) {
      setPhase("oral_open");
    } else {
      setReadingIdx((i) => i + 1);
    }
  }

  // ── Oral open (Part C) ──────────────────────────────────────────────────────

  function handleStartOpen() {
    setOpenTranscript("");
    setHasAnswered(false);
    setVoiceErrorC(null);
    voiceRec.start((text, errorCode) => {
      setOpenTranscript(text);
      setHasAnswered(true);
      setVoiceErrorC(errorCode ?? null);
    });
  }

  function handleStopOpen() {
    voiceRec.stop();
  }

  function handleFinishOpen() {
    void finishAll(textLevel, diagnosticId, readingTranscripts, openTranscript, false);
  }

  // ── Final evaluation & save ──────────────────────────────────────────────────

  async function finishAll(
    tLevel: Level,
    diagId: string | null,
    rTranscripts: string[],
    oTranscript: string,
    skip: boolean
  ) {
    setBusy(true);
    setPhase("evaluating");

    let oralReadLvl: Level = tLevel;
    let oralOpenLvl: Level = tLevel;
    let pronunciationErrors: Array<{ sound: string; word: string }> = [];

    if (!skip && rTranscripts.some((t) => t.trim())) {
      const result = await evaluateReading(READING_SENTENCES, rTranscripts);
      oralReadLvl = result.level;
      pronunciationErrors = result.errors;
    }

    if (!skip && oTranscript.trim()) {
      oralOpenLvl = await evaluateOpenResponse(openQuestion, oTranscript);
    }

    const oralLvl: Level  = skip ? tLevel : minCefr(oralReadLvl, oralOpenLvl);
    const finalLvl: Level = skip ? tLevel : minCefr(tLevel, oralLvl);

    setOralReadingLevel(oralReadLvl);
    setOralOpenLevel(oralOpenLvl);
    setFinalLevel(finalLvl);

    if (session) {
      if (diagId) {
        await supabase
          .from("diagnostics")
          .update({
            oral_reading_transcript: rTranscripts,
            oral_reading_level: oralReadLvl,
            oral_open_transcript: { question: openQuestion, answer: oTranscript },
            oral_open_level: oralOpenLvl,
            oral_level: oralLvl,
            final_level: finalLvl,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", diagId);
      }

      if (pronunciationErrors.length > 0) {
        await supabase.from("errors").insert(
          pronunciationErrors.map((e) => ({
            user_id: session.user.id,
            session_id: null,
            error_type: "pronunciation_error",
            original_text: e.word,
          }))
        );
      }

      await supabase
        .from("profiles")
        .update({
          diagnosed_level: finalLvl,
          current_level: finalLvl,
          diagnostic_complete: true,
        })
        .eq("id", session.user.id);

      await refreshProfile();
    }

    setBusy(false);
    setPhase("done");
  }

  // ── Shared: exit button + overlay ───────────────────────────────────────────

  const exitButton = phase !== "done" && phase !== "evaluating" ? (
    <button
      onClick={handleExit}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-ink-700/80 hover:bg-ink-600 text-paper-muted hover:text-paper transition"
      aria-label="Exit diagnostic"
    >
      <X size={18} />
    </button>
  ) : null;

  const exitOverlay = confirmExit ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-6">
      <div className="card w-full max-w-sm p-6 text-center animate-fade-up">
        <p className="font-display font-bold text-lg mb-2">¿Salir del test?</p>
        <p className="text-sm text-paper-muted mb-6">
          Perdés el progreso de esta sesión. Podés volver a hacerlo cuando quieras.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmExit(false)}
            className="flex-1 py-2.5 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-medium transition"
          >
            Seguir
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-2.5 rounded-xl bg-coral/20 hover:bg-coral/30 text-coral font-medium transition"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Render: evaluating ──────────────────────────────────────────────────────

  if (phase === "evaluating") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-up">
          <BrandDots size="md" />
          <p className="mt-4 text-paper-muted">Evaluating your speaking…</p>
          <p className="text-xs text-paper-faint mt-1">This takes a few seconds</p>
        </div>
      </div>
    );
  }

  // ── Render: done ────────────────────────────────────────────────────────────

  if (phase === "done") {
    const hasSpeaking = oralReadingLevel && oralOpenLevel;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-up">
          <p className="eyebrow mb-3">Level assessment</p>
          <div className="font-display text-7xl font-extrabold text-coral mb-2">{finalLevel}</div>
          <p className="text-paper-muted mb-6">Your starting level in Babelito.</p>

          {hasSpeaking && (
            <div className="card p-5 mb-6 text-left space-y-3">
              <p className="text-xs text-paper-faint uppercase tracking-widest font-mono mb-1">Breakdown</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-paper-muted">Written English</span>
                <span className="font-display font-bold text-coral">{textLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-paper-muted">Reading aloud</span>
                <span className="font-display font-bold text-mint">{oralReadingLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-paper-muted">Spoken fluency</span>
                <span className="font-display font-bold text-mint">{oralOpenLevel}</span>
              </div>
              <p className="text-xs text-paper-faint mt-2 border-t border-ink-600 pt-3">
                Your level is set to the lowest score — that's where you need the most practice.
              </p>
            </div>
          )}

          <p className="text-paper-muted text-sm mb-8">
            Every conversation from now on is tuned to this level — and it'll move up as you improve.
          </p>
          <button className="btn-coral w-full" onClick={() => navigate("/", { replace: true })}>
            Enter Babelito →
          </button>
        </div>
      </div>
    );
  }

  // ── Render: oral open (Part C) ──────────────────────────────────────────────

  if (phase === "oral_open") {
    const canFinish = openTranscript.trim() !== "";

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {exitButton}
        {exitOverlay}
        <div className="w-full max-w-lg animate-fade-up">
          <div className="mb-6">
            <p className="eyebrow mb-1">Part C · Quick chat</p>
            <p className="text-sm text-paper-muted">Speak your answer naturally. There's no right or wrong.</p>
          </div>

          {loadingQuestion ? (
            <div className="flex justify-center py-12">
              <BrandDots size="md" />
            </div>
          ) : (
            <>
              <div className="card p-6 mb-6">
                <p className="text-xs text-paper-faint font-mono uppercase tracking-widest mb-2">Question</p>
                <p className="font-display text-xl font-bold leading-snug">{openQuestion}</p>
                <button
                  onClick={() => speak(openQuestion, "en-GB")}
                  className="mt-3 text-paper-faint hover:text-coral transition"
                  aria-label="Hear question"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* Voice feedback / fallback area */}
              <div className="card p-5 mb-4 min-h-[100px]">
                {voiceRec.isRecording ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <VoiceWave />
                      <span className="text-xs text-coral font-mono">Listening…</span>
                    </div>
                    <p className="text-sm text-paper-muted italic min-h-[24px]">
                      {voiceRec.interim || "Speak now…"}
                    </p>
                  </>
                ) : hasAnswered ? (
                  <>
                    {voiceErrorC && !openTranscript && (
                      <p className="text-xs text-coral mb-2">
                        ⚠ {voiceErrorMsg(voiceErrorC)} Try again or type below.
                      </p>
                    )}
                    <p className="text-xs text-paper-faint font-mono uppercase tracking-widest mb-1">
                      {openTranscript ? "Your answer" : "Type your answer"}
                    </p>
                    <textarea
                      value={openTranscript}
                      onChange={(e) => setOpenTranscript(e.target.value)}
                      placeholder="Type your answer here…"
                      className="w-full bg-ink-700 rounded-lg p-2 text-sm text-paper resize-none min-h-[64px] focus:outline-none focus:ring-1 focus:ring-coral"
                      rows={3}
                    />
                  </>
                ) : (
                  <p className="text-sm text-paper-faint text-center pt-2">
                    Tap the microphone to start speaking — or type your answer below.
                  </p>
                )}
              </div>

              {/* Always-visible text fallback when not yet answered */}
              {!hasAnswered && !voiceRec.isRecording && (
                <textarea
                  value={openTranscript}
                  onChange={(e) => setOpenTranscript(e.target.value)}
                  placeholder="Or type your answer here…"
                  className="w-full bg-ink-700/60 border border-ink-600 rounded-xl p-3 text-sm text-paper resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-coral"
                  rows={3}
                />
              )}

              <div className="flex gap-3">
                {voiceRec.isRecording ? (
                  <button
                    onClick={handleStopOpen}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-coral text-ink-900 font-semibold transition"
                  >
                    <Square size={16} /> Done
                  </button>
                ) : (
                  <button
                    onClick={handleStartOpen}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-semibold transition"
                  >
                    <Mic size={16} />
                    {hasAnswered ? "Try again" : "Speak your answer"}
                  </button>
                )}
              </div>

              {canFinish && (
                <button
                  onClick={handleFinishOpen}
                  disabled={busy}
                  className="btn-coral w-full mt-4 flex items-center justify-center gap-2"
                >
                  {busy ? <><BrandDots /> Saving…</> : "Finish assessment →"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Render: oral reading (Part B) ───────────────────────────────────────────

  if (phase === "oral_reading") {
    const sentence   = READING_SENTENCES[readingIdx];
    const canAdvance = currentTranscript.trim() !== "";

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {exitButton}
        {exitOverlay}
        <div className="w-full max-w-lg animate-fade-up">
          <div className="flex gap-1 mb-6">
            {READING_SENTENCES.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i < readingIdx ? "bg-mint" : i === readingIdx ? "bg-coral" : "bg-ink-600"
                }`}
              />
            ))}
          </div>

          <div className="mb-6">
            <p className="eyebrow mb-1">Part B · Reading aloud</p>
            <p className="text-sm text-paper-muted">
              Sentence {readingIdx + 1} of {READING_SENTENCES.length} — read it clearly in English.
            </p>
          </div>

          <div className="card p-6 mb-6">
            <p className="font-display text-xl font-bold leading-snug">{sentence.text}</p>
            <button
              onClick={() => speak(sentence.text, "en-GB")}
              className="mt-3 text-paper-faint hover:text-coral transition"
              aria-label="Hear example"
            >
              <Volume2 size={16} />
            </button>
          </div>

          {/* Voice feedback / fallback area */}
          <div className="card p-5 mb-4 min-h-[90px]">
            {voiceRec.isRecording ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <VoiceWave />
                  <span className="text-xs text-coral font-mono">Listening…</span>
                </div>
                <p className="text-sm text-paper-muted italic min-h-[20px]">
                  {voiceRec.interim || "Read the sentence above…"}
                </p>
              </>
            ) : hasRecorded ? (
              <>
                {voiceErrorB && !currentTranscript && (
                  <p className="text-xs text-coral mb-2">
                    ⚠ {voiceErrorMsg(voiceErrorB)} Try again or type what you said.
                  </p>
                )}
                <p className="text-xs text-paper-faint font-mono uppercase tracking-widest mb-1">
                  {currentTranscript ? "You said" : "Type what you said"}
                </p>
                <textarea
                  value={currentTranscript}
                  onChange={(e) => setCurrentTranscript(e.target.value)}
                  placeholder="Type what you said…"
                  className="w-full bg-ink-700 rounded-lg p-2 text-sm text-paper resize-none min-h-[48px] focus:outline-none focus:ring-1 focus:ring-coral"
                  rows={2}
                />
              </>
            ) : (
              <p className="text-sm text-paper-faint text-center pt-2">
                Tap the microphone, read the sentence, then tap Done.
              </p>
            )}
          </div>

          {/* Always-visible text fallback when not yet recorded */}
          {!hasRecorded && !voiceRec.isRecording && (
            <textarea
              value={currentTranscript}
              onChange={(e) => setCurrentTranscript(e.target.value)}
              placeholder="Or type what you said…"
              className="w-full bg-ink-700/60 border border-ink-600 rounded-xl p-3 text-sm text-paper resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-coral"
              rows={2}
            />
          )}

          <div className="flex gap-3">
            {voiceRec.isRecording ? (
              <button
                onClick={handleStopReading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-coral text-ink-900 font-semibold transition"
              >
                <Square size={16} /> Done
              </button>
            ) : (
              <button
                onClick={handleStartReading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-ink-600 hover:bg-ink-500 text-paper font-semibold transition"
              >
                <Mic size={16} />
                {hasRecorded ? "Try again" : "Tap to read"}
              </button>
            )}
          </div>

          {canAdvance && (
            <button onClick={handleNextSentence} className="btn-coral w-full mt-4">
              {readingIdx + 1 >= READING_SENTENCES.length
                ? "Continue to Part C →"
                : "Next sentence →"}
            </button>
          )}

          {!voiceRec.isRecording && !hasRecorded && !currentTranscript && readingIdx === 0 && (
            <button
              onClick={() => void finishAll(textLevel, diagnosticId, [], "", true)}
              className="w-full mt-3 text-xs text-paper-faint hover:text-paper transition text-center"
            >
              Skip speaking test
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render: text phase (Part A) ─────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {exitButton}
      {exitOverlay}
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex gap-1 mb-8">
          {DIAGNOSTIC.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-coral" : "bg-ink-600"}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="eyebrow">
            Question {idx + 1} / {DIAGNOSTIC.length}
          </p>
          <span className="font-mono text-xs text-paper-faint">{q.skill}</span>
        </div>

        <h1 className="font-display text-2xl font-bold mb-7 leading-snug">{q.prompt}</h1>

        <div className="flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const isPicked = selected === i;
            return (
              <button
                key={i}
                disabled={selected !== null || busy}
                onClick={() => choose(i)}
                className={`card px-4 py-3.5 text-left font-medium transition ${
                  isPicked ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
                }`}
              >
                <span className="font-mono text-xs text-paper-faint mr-3">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
