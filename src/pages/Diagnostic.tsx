import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { DIAGNOSTIC, estimateLevel } from "../lib/diagnosticQuestions";
import type { Level, DiagnosticAnswer } from "../lib/types";

export default function Diagnostic() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Level | null>(null);
  const [busy, setBusy] = useState(false);

  const q = DIAGNOSTIC[idx];
  const isLast = idx === DIAGNOSTIC.length - 1;

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
        await finish(next);
      } else {
        setAnswers(next);
        setIdx((i) => i + 1);
      }
    }, 380);
  }

  async function finish(allAnswers: DiagnosticAnswer[]) {
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
    const level = estimateLevel(buckets);
    const rawScore = allAnswers.filter((a) => a.correct).length;
    setResult(level);

    if (session) {
      await supabase.from("diagnostics").insert({
        user_id: session.user.id,
        answers: allAnswers,
        raw_score: rawScore,
        estimated_level: level,
      });
      await supabase
        .from("profiles")
        .update({
          diagnosed_level: level,
          current_level: level,
          diagnostic_complete: true,
        })
        .eq("id", session.user.id);
      await refreshProfile();
    }
    setBusy(false);
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-fade-up">
          <p className="eyebrow mb-3">Your estimated level</p>
          <div className="font-display text-7xl font-extrabold text-coral mb-2">{result}</div>
          <p className="text-paper-muted mb-8">
            Every conversation from now on is tuned to this level — and it'll move up as you do.
          </p>
          <button className="btn-coral w-full" onClick={() => navigate("/", { replace: true })}>
            Enter Babelito →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
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
