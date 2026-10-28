import { useState } from "react";
import { QUIZ_PASS_PERCENT, quizPercent } from "../lib/situations";
import type { ExerciseItem } from "../lib/mistakes";

/**
 * Quiz de opción múltiple reutilizable (lecciones de gramática y ejercicios
 * dirigidos). Muestra una pregunta por vez, explica el acierto/error y, al
 * terminar, avisa el resultado con onFinish.
 */
export default function MultipleChoiceQuiz({
  items,
  onFinish,
  onRetry,
  retryLabel,
}: {
  items: ExerciseItem[];
  onFinish: (correct: number, total: number) => void;
  /** Si se pasa, el resultado ofrece volver a intentar (el padre arma otras preguntas). */
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  if (items.length === 0) return <p className="text-sm text-paper-muted">No exercises available right now.</p>;

  const item = items[i];

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === item.correctIndex) setCorrect((c) => c + 1);
  }

  function next() {
    if (i + 1 < items.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    setFinished(true);
    onFinish(correct, items.length);
  }

  if (finished) {
    const pct = quizPercent(correct, items.length);
    const pass = pct >= QUIZ_PASS_PERCENT;
    return (
      <div className="card p-6 text-center">
        <p className={`font-display text-5xl font-extrabold ${pass ? "text-mint" : "text-gold"}`}>{pct}%</p>
        <p className="mt-1 text-paper-muted">
          {correct} of {items.length} correct
        </p>
        <p className="mt-3 text-sm">{pass ? "Well done!" : "Keep practising — read the rules again and retry."}</p>
        {onRetry && (
          <button className="btn-coral mt-5 w-full" onClick={onRetry}>
            {retryLabel ?? "Try again"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-paper-muted">
        Question {i + 1} of {items.length}
      </p>
      <p className="font-display text-lg font-semibold leading-snug">{item.q}</p>
      <ul className="space-y-2">
        {item.options.map((o, idx) => {
          const isRight = idx === item.correctIndex;
          const state =
            picked === null
              ? "border-ink-600 bg-ink-800 hover:bg-ink-700"
              : isRight
              ? "border-mint bg-mint/10"
              : idx === picked
              ? "border-coral bg-coral/10"
              : "border-ink-600 bg-ink-800 opacity-60";
          return (
            <li key={`${o}-${idx}`}>
              <button onClick={() => choose(idx)} disabled={picked !== null} className={`w-full rounded-xl border p-3 text-left transition ${state}`}>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="space-y-3">
          <p className={`text-sm ${picked === item.correctIndex ? "text-mint" : "text-coral"}`}>
            {picked === item.correctIndex ? "Correct!" : "Not quite — the green one is right."}
          </p>
          {item.explain && <p className="text-xs text-paper-muted">{item.explain}</p>}
          <button className="btn-coral w-full" onClick={next}>
            {i + 1 < items.length ? "Next" : "See result"}
          </button>
        </div>
      )}
    </div>
  );
}
