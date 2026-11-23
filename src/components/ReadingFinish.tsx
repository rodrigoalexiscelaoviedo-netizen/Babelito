import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Layers, Volume2, X } from "lucide-react";
import { loadReadingQuiz, textKey, type QuizQuestion } from "../lib/readingQuiz";
import { awardXp } from "../lib/xp";
import { localDateISO } from "../lib/dates";
import { speak } from "../lib/speech";
import type { VoicePrefs } from "../lib/useVoicePrefs";
import { recordSkillAttempt } from "../lib/skillLevels";
import type { ReadingText } from "../lib/readingTexts";

export interface SavedWord {
  word: string;
  translation: string;
}

type Phase = "start" | "loading" | "quiz" | "words" | "done";

const QUESTION_XP = 5;
const WORD_XP = 2;
const BASE_XP = 10;

const TEXT = {
  en: {
    doneQ: "Done reading?",
    lockIn: "Lock it in: a 1-minute check",
    intro: "Three quick questions to see what you understood",
    savedPart: (n: number) => `, then a look back at the ${n} word${n === 1 ? "" : "s"} you saved`,
    introEnd: ". You earn XP and the words come back in Review.",
    checkBtn: "Check my understanding",
    loading: "Writing your questions…",
    questionOf: (i: number, n: number) => `Question ${i} of ${n}`,
    correctSr: "(correct answer)",
    wrongSr: "(your answer, not correct)",
    correct: "Correct.",
    notCorrect: (ans: string) => `Not correct. The right answer is: ${ans}`,
    next: "Next",
    nowWords: "Now your words",
    seeResult: "See my result",
    yourWords: (i: number, n: number) => `Your words · ${i} of ${n}`,
    hear: (w: string) => `Hear ${w}`,
    think: "What does it mean? Think first, then check.",
    showMeaning: "Show the meaning",
    notYet: "Not yet",
    remembered: "I remembered it",
    niceReading: "Nice reading!",
    understanding: "Understanding",
    wordsRemembered: "Words you remembered",
    savedNote: (n: number) => `${n} saved: they come back in Review.`,
    reviewWords: "Review my words",
    readAnother: "Read another text",
  },
  ca: {
    doneQ: "Has acabat de llegir?",
    lockIn: "Fixa-ho: una comprovació d'un minut",
    intro: "Tres preguntes ràpides per veure què has entès",
    savedPart: (n: number) => `, i després un repàs de les ${n} paraules que has guardat`,
    introEnd: ". Guanyes XP i les paraules tornen a Repàs.",
    checkBtn: "Comprova si ho he entès",
    loading: "Preparant les preguntes…",
    questionOf: (i: number, n: number) => `Pregunta ${i} de ${n}`,
    correctSr: "(resposta correcta)",
    wrongSr: "(la teva resposta, no és correcta)",
    correct: "Correcte.",
    notCorrect: (ans: string) => `No és correcte. La resposta bona és: ${ans}`,
    next: "Següent",
    nowWords: "Ara les teves paraules",
    seeResult: "Veure el meu resultat",
    yourWords: (i: number, n: number) => `Les teves paraules · ${i} de ${n}`,
    hear: (w: string) => `Escolta ${w}`,
    think: "Què vol dir? Pensa-hi primer i després comprova.",
    showMeaning: "Mostra el significat",
    notYet: "Encara no",
    remembered: "Me'n recordava",
    niceReading: "Bona lectura!",
    understanding: "Comprensió",
    wordsRemembered: "Paraules que recordaves",
    savedNote: (n: number) => `${n} guardades: tornen a Repàs.`,
    reviewWords: "Repassa les meves paraules",
    readAnother: "Llegeix un altre text",
  },
} as const;

/**
 * Cierre de una lectura: en vez de terminar el texto sin más, la persona
 * comprueba que entendió, recuerda las palabras que guardó y ve qué sigue.
 */
export default function ReadingFinish({
  text,
  saved,
  userId,
  voicePrefs,
  onNext,
  lang = "en",
}: {
  text: ReadingText;
  saved: SavedWord[];
  userId: string;
  voicePrefs: VoicePrefs;
  onNext: () => void;
  lang?: "en" | "ca";
}) {
  const navigate = useNavigate();
  const t = TEXT[lang];
  const [phase, setPhase] = useState<Phase>("start");
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  // Palabras a recordar: las guardadas hasta el momento de empezar.
  const [toRecall, setToRecall] = useState<SavedWord[]>([]);
  const [wi, setWi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [xp, setXp] = useState(0);
  // Al cambiar de pregunta o de palabra, el foco va al contenido nuevo (lectores de pantalla lo anuncian).
  const focusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    focusRef.current?.focus();
  }, [phase, qi, wi]);

  async function start() {
    const recall = saved.filter((w) => w.translation).slice(0, 4);
    setToRecall(recall);
    setPhase("loading");
    let q: QuizQuestion[] = [];
    try {
      q = await loadReadingQuiz(text.id, text.content, text.level, lang);
    } catch {
      /* sin preguntas: se sigue con las palabras */
    }
    setQuiz(q);
    if (q.length > 0) setPhase("quiz");
    else if (recall.length > 0) setPhase("words");
    else finish(0, 0);
  }

  function goAfterQuiz() {
    if (toRecall.length > 0) setPhase("words");
    else finish(correct, remembered);
  }

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === quiz[qi].answer) setCorrect((c) => c + 1);
  }

  function nextQuestion() {
    setPicked(null);
    if (qi + 1 < quiz.length) setQi(qi + 1);
    else goAfterQuiz();
  }

  function rate(gotIt: boolean) {
    const r = remembered + (gotIt ? 1 : 0);
    setRemembered(r);
    setRevealed(false);
    if (wi + 1 < toRecall.length) setWi(wi + 1);
    else finish(correct, r);
  }

  function finish(questionsRight: number, wordsRight: number) {
    const amount = BASE_XP + questionsRight * QUESTION_XP + wordsRight * WORD_XP;
    setXp(amount);
    setPhase("done");
    // Nivel de lectura: aciertos del cuestionario sobre sus preguntas.
    if (quiz.length > 0) void recordSkillAttempt(userId, "reading", questionsRight, quiz.length);
    void awardXp(userId, {
      source: "story",
      refKey: `reading:${textKey(text.id, text.content)}:${localDateISO()}`,
      amount,
      meta: { kind: "reading", questionsRight, wordsRight },
    });
  }

  const say = (s: string) => speak(s, { voiceName: voicePrefs.voiceName ?? undefined, rate: voicePrefs.voiceRate, lang: voicePrefs.voiceAccent });

  // ── Pantallas ──────────────────────────────────────────────────────────────

  if (phase === "start") {
    return (
      <div className="card animate-fade-up border-coral/30 bg-gradient-to-br from-ink-700 to-ink-800 p-5">
        <p className="eyebrow mb-1">{t.doneQ}</p>
        <h3 className="font-display text-lg font-bold">{t.lockIn}</h3>
        <p className="mt-1 text-sm text-paper-muted">
          {t.intro}
          {saved.length > 0 ? t.savedPart(saved.length) : ""}
          {t.introEnd}
        </p>
        <button className="btn-coral mt-4 w-full" onClick={start}>
          {t.checkBtn}
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="card p-5 text-center">
        <p role="status" className="animate-pulse text-sm text-paper-muted">{t.loading}</p>
      </div>
    );
  }

  if (phase === "quiz" && quiz.length > 0) {
    const q = quiz[qi];
    return (
      <div className="card animate-fade-up p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">{t.questionOf(qi + 1, quiz.length)}</p>
          <div className="flex gap-1" aria-hidden>
            {quiz.map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i < qi ? "bg-mint" : i === qi ? "bg-coral" : "bg-ink-600"}`} />
            ))}
          </div>
        </div>
        <p ref={focusRef} tabIndex={-1} className="mb-4 font-medium leading-snug outline-none">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((o, i) => {
            const isRight = i === q.answer;
            const state =
              picked === null
                ? "border-ink-600 hover:border-coral/60 hover:bg-ink-700"
                : isRight
                  ? "border-mint bg-mint/10 text-mint"
                  : i === picked
                    ? "border-coral bg-coral/10 text-coral"
                    : "border-ink-600 opacity-50";
            return (
              <button
                key={i}
                disabled={picked !== null}
                onClick={() => answer(i)}
                className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.99] ${state}`}
              >
                <span className="flex-1">{o}</span>
                {picked !== null && isRight && <Check aria-hidden size={16} className="animate-check-pop" />}
                {picked !== null && i === picked && !isRight && <X aria-hidden size={16} />}
                {picked !== null && isRight && <span className="sr-only">{t.correctSr}</span>}
                {picked !== null && i === picked && !isRight && <span className="sr-only">{t.wrongSr}</span>}
              </button>
            );
          })}
        </div>
        <p role="status" className="sr-only">
          {picked === null ? "" : picked === q.answer ? t.correct : t.notCorrect(q.options[q.answer])}
        </p>
        {picked !== null && (
          <button className="btn-coral mt-4 w-full animate-fade-up" onClick={nextQuestion}>
            {qi + 1 < quiz.length ? t.next : toRecall.length > 0 ? t.nowWords : t.seeResult}
          </button>
        )}
      </div>
    );
  }

  if (phase === "words" && toRecall[wi]) {
    const w = toRecall[wi];
    return (
      <div className="card animate-fade-up p-5 text-center">
        <p ref={focusRef} tabIndex={-1} className="eyebrow mb-3 outline-none">
          {t.yourWords(wi + 1, toRecall.length)}
        </p>
        <button className="inline-flex items-center gap-2 font-display text-3xl font-bold" onClick={() => say(w.word)} aria-label={t.hear(w.word)}>
          {w.word} <Volume2 size={20} className="text-coral" />
        </button>
        <p className="mt-1 text-xs text-paper-faint">{t.think}</p>
        {revealed ? (
          <div className="animate-fade-up">
            <p className="mt-4 font-display text-2xl font-bold text-coral">{w.translation}</p>
            <div className="mt-5 flex gap-2">
              <button className="flex-1 rounded-xl bg-ink-600 py-2.5 text-sm font-medium transition hover:bg-ink-500" onClick={() => rate(false)}>
                {t.notYet}
              </button>
              <button className="btn-mint flex-1 py-2.5 text-sm" onClick={() => rate(true)}>
                {t.remembered}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-coral mt-5 w-full" onClick={() => setRevealed(true)}>
            {t.showMeaning}
          </button>
        )}
      </div>
    );
  }

  // done
  return (
    <div className="card animate-fade-up border-mint/30 p-5 text-center">
      <CheckCircle2 size={36} className="animate-check-pop mx-auto mb-2 text-mint" />
      <h3 className="font-display text-xl font-bold">{t.niceReading}</h3>
      <p className="mt-1 text-sm text-mint">+{xp} XP</p>
      <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm text-paper-muted">
        {quiz.length > 0 && (
          <li>
            {t.understanding}: <span className="font-medium text-paper">{correct}/{quiz.length}</span>
          </li>
        )}
        {toRecall.length > 0 && (
          <li>
            {t.wordsRemembered}: <span className="font-medium text-paper">{remembered}/{toRecall.length}</span>
          </li>
        )}
        {saved.length > 0 && <li>{t.savedNote(saved.length)}</li>}
      </ul>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {saved.length > 0 && (
          <button className="btn-coral flex flex-1 items-center justify-center gap-2" onClick={() => navigate("/review")}>
            <Layers size={16} /> {t.reviewWords}
          </button>
        )}
        <button className="flex-1 rounded-xl bg-ink-600 py-2.5 text-sm font-medium transition hover:bg-ink-500" onClick={onNext}>
          {t.readAnother}
        </button>
      </div>
    </div>
  );
}
