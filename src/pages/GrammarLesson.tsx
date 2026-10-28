import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Volume2, X, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { speak, stopSpeech } from "../lib/speech";
import MultipleChoiceQuiz from "../components/MultipleChoiceQuiz";
import { getLesson } from "../lib/grammarLessons";
import { loadGrammarScores, saveGrammarScore } from "../lib/grammarProgress";
import { buildQuiz, quizPercent, QUIZ_PASS_PERCENT } from "../lib/situations";

export default function GrammarLesson() {
  const { id } = useParams();
  const { profile } = useAuth();
  const prefs = useVoicePrefs();
  const lesson = getLesson(id);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  const quiz = useMemo(
    () => (lesson ? buildQuiz(lesson.quiz) : []),
    // Preguntas nuevas solo al reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson?.id, round]
  );

  useEffect(() => {
    if (!profile || !lesson) return;
    let cancelled = false;
    void loadGrammarScores(profile.id).then((s) => {
      if (!cancelled) setBest(s[lesson.id] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, lesson]);

  useEffect(() => () => stopSpeech(), []);

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;
  if (!lesson) return <Navigate to="/grammar" replace />;

  const say = (text: string) =>
    speak(text.replace(/\s*\(.*$/, ""), { voiceName: prefs.voiceName ?? undefined, rate: prefs.voiceRate, lang: prefs.voiceAccent });

  async function finished(correct: number, total: number) {
    if (!profile || !lesson) return;
    setBest(await saveGrammarScore(profile.id, lesson.id, quizPercent(correct, total)));
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link to="/grammar" className="mb-4 inline-flex items-center gap-1.5 text-xs text-paper-muted transition hover:text-paper">
        <ArrowLeft size={14} /> All lessons
      </Link>

      <p className="eyebrow">Grammar · {lesson.level}</p>
      <h1 className="page-title mb-1">{lesson.title}</h1>
      <p className="mb-6 text-paper-muted">{lesson.summary}</p>

      <div className="space-y-5">
        {lesson.rules.map((r) => (
          <section key={r.title} className="card p-5">
            <h2 className="mb-1 font-display text-lg font-bold">{r.title}</h2>
            <p className="mb-3 text-sm text-paper-muted">{r.body}</p>
            <ul className="space-y-2">
              {r.examples.map((ex) => (
                <li key={ex.en} className="flex items-start gap-3">
                  <button onClick={() => say(ex.en)} className="mt-0.5 text-paper-faint transition hover:text-coral" aria-label={`Listen: ${ex.en}`}>
                    <Volume2 size={15} />
                  </button>
                  <div>
                    <p className="font-medium">{ex.en}</p>
                    <p className="text-xs text-paper-muted">{ex.es}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Common mistakes</h2>
          <ul className="space-y-2">
            {lesson.mistakes.map((m) => (
              <li key={m.wrong} className="card p-4">
                <p className="flex items-start gap-2 text-sm text-coral">
                  <X size={15} className="mt-0.5 shrink-0" /> <span className="line-through decoration-coral/60">{m.wrong}</span>
                </p>
                <p className="mt-1 flex items-start gap-2 text-sm text-mint">
                  <Check size={15} className="mt-0.5 shrink-0" /> <span>{m.right}</span>
                </p>
                <p className="mt-2 text-xs text-paper-muted">{m.why}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Quiz</h2>
            {best !== null && best > 0 && (
              <span className={`text-xs ${best >= QUIZ_PASS_PERCENT ? "text-mint" : "text-paper-faint"}`}>Best: {best}%</span>
            )}
          </div>
          <MultipleChoiceQuiz key={round} items={quiz} onFinish={finished} onRetry={() => setRound((r) => r + 1)} retryLabel="Try again" />
        </section>
      </div>
    </div>
  );
}
