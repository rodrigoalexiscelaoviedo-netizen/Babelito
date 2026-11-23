import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Library, Volume2, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { awardXp, reviewXp } from "../lib/xp";
import { localDateISO } from "../lib/dates";
import { applyReview, getDeckSample, getDueItems, type ReviewItem } from "../lib/srs";
import { speak, stopSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import {
  SESSION_SIZE,
  buildGapFromExample,
  buildGapFromPhrase,
  buildListen,
  buildPool,
  cardKindFor,
  type CardKind,
  type GapCard,
  type ListenCard,
  type Pool,
  type ReviewMeta,
} from "../lib/reviewCards";
import { loadReviewMeta, metaKey } from "../lib/reviewMeta";
import ShadowingBlock from "../components/ShadowingBlock";
import Loader from "../components/Loader";
import Maica from "../components/Maica";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { tFor } from "../i18n";

type T = ReturnType<typeof tFor>;

interface Entry {
  item: ReviewItem;
  kind: CardKind;
  /** Segunda oportunidad dentro de la misma sesión (no cambia el calendario). */
  retry: boolean;
  listen?: ListenCard;
  gap?: GapCard;
  meta?: ReviewMeta;
}

type Phase = "loading" | "empty" | "session" | "done";

const KIND_KEY: Record<CardKind, string> = {
  meet: "review.kindMeet",
  listen: "review.kindListen",
  gap: "review.kindGap",
  say: "review.kindSay",
};

/** Arma la tarjeta de un ítem: si no se puede el ejercicio ideal, cae a uno más simple. */
function makeEntry(item: ReviewItem, pool: Pool, meta: ReviewMeta | undefined, retry = false): Entry {
  const hasExample = !!meta?.example;
  let kind: CardKind = retry ? "listen" : cardKindFor(item, hasExample);
  let gap: GapCard | undefined;
  let listen: ListenCard | undefined;

  if (kind === "gap") {
    const g = item.item_type === "chunk" ? buildGapFromPhrase(item.content, pool) : meta?.example ? buildGapFromExample(item.content, meta.example, pool) : null;
    if (g) gap = g;
    else kind = item.item_type === "chunk" ? "say" : "listen";
  }
  if (kind === "listen") listen = buildListen(item, pool);
  return { item, kind, retry, listen, gap, meta };
}

export default function Review() {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const lang = profile?.learning_language || "en";
  const t = tFor(lang);
  const accentFallback = lang === "ca" ? "ca-ES" : "en-GB";
  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<Entry[]>([]);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<{ correct: boolean } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [stats, setStats] = useState({ firstTry: 0, firstTryRight: 0, learned: 0 });
  const [missed, setMissed] = useState<ReviewItem[]>([]);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const poolRef = useRef<Pool>({ chunks: [], words: [] });
  const metaRef = useRef<Record<string, ReviewMeta>>({});

  const say = useCallback(
    (text: string) => speak(text, { voiceName: voicePrefs.voiceName ?? undefined, rate: voicePrefs.voiceRate ?? 0.9, lang: voicePrefs.voiceAccent ?? accentFallback }),
    [voicePrefs.voiceName, voicePrefs.voiceRate, voicePrefs.voiceAccent, accentFallback]
  );

  const start = useCallback(async () => {
    if (!profile) return;
    setPhase("loading");
    const language = profile.learning_language || "en";
    const [due, deck] = await Promise.all([getDueItems(profile.id, language), getDeckSample(profile.id, language)]);
    if (due.length === 0) {
      setPhase("empty");
      return;
    }
    const batch = due.slice(0, SESSION_SIZE);
    poolRef.current = buildPool(deck);
    // Definiciones y ejemplos en inglés: se esperan unos segundos como máximo.
    metaRef.current = await Promise.race([loadReviewMeta(batch), new Promise<Record<string, ReviewMeta>>((r) => setTimeout(() => r({}), 7000))]);
    const entries = batch.map((it) => makeEntry(it, poolRef.current, metaRef.current[metaKey(it.content)]));
    setQueue(entries);
    setRemaining(due.length - batch.length);
    setPos(0);
    setAnswered(null);
    setMissed([]);
    setStats({ firstTry: 0, firstTryRight: 0, learned: 0 });
    setPhase("session");
  }, [profile]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => () => stopSpeech(), []);

  const entry = queue[pos] ?? null;

  const onAnswer = useCallback((correct: boolean) => setAnswered({ correct }), []);

  async function next() {
    if (!entry || !answered || !profile) return;
    stopSpeech();
    const { item, retry } = entry;
    const next: Entry[] = [];

    if (!retry) {
      const quality = answered.correct ? "good" : "again";
      await applyReview(item.id, item, quality);
      void awardXp(profile.id, { source: "review", refKey: `review:${item.id}:${localDateISO()}`, amount: reviewXp(quality) });
      setStats((s) => ({
        firstTry: s.firstTry + 1,
        firstTryRight: s.firstTryRight + (answered.correct ? 1 : 0),
        learned: s.learned + (answered.correct && item.reps === 0 ? 1 : 0),
      }));
      if (!answered.correct) {
        setMissed((m) => [...m, item]);
        // Segunda oportunidad al final de la sesión.
        next.push(makeEntry(item, poolRef.current, metaRef.current[metaKey(item.content)], true));
      }
    }

    const newQueue = [...queue, ...next];
    setQueue(newQueue);
    setAnswered(null);
    if (pos + 1 >= newQueue.length) {
      setPhase("done");
      void checkAchievements(profile.id).then((n) => n.length > 0 && setNewAchievements(n));
    } else {
      setPos(pos + 1);
    }
  }

  const progress = useMemo(() => (queue.length ? Math.round((pos / queue.length) * 100) : 0), [pos, queue.length]);

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <Loader label={t("review.loadingPrep")} />
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="animate-fade-up mx-auto max-w-md pt-12">
        <div className="card p-8 text-center">
          <Maica mood="curious" size="md" className="mx-auto mb-2" />
          <h1 className="mb-2 font-display text-2xl font-extrabold">{t("review.caughtTitle")}</h1>
          <p className="mb-6 text-sm text-paper-muted">{t("review.caughtSub")}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/situations" className="btn-mint text-sm">
              <Library size={15} /> {t("review.situations")}
            </Link>
            <Link to="/stories" className="btn-ghost text-sm">
              <BookOpen size={15} /> {t("review.stories")} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const pct = stats.firstTry ? Math.round((stats.firstTryRight / stats.firstTry) * 100) : 0;
    return (
      <>
        <AchievementCelebration
          achievements={newAchievements}
          onClose={() => {
            if (profile) void markSeen(profile.id, newAchievements.map((a) => a.key));
            setNewAchievements([]);
          }}
        />
        <div className="animate-fade-up mx-auto max-w-md pt-10 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-mint" />
          <h1 className="page-title mb-1">{t("review.sessionDone")}</h1>
          <p className="text-paper-muted">
            <span className="font-display text-xl font-bold text-mint">{t("review.rightFirst", { a: stats.firstTryRight, b: stats.firstTry, pct })}</span>
          </p>
          {stats.learned > 0 && (
            <p className="mt-1 text-sm text-mint">
              {stats.learned === 1
                ? t("review.newLearnedOne", { n: stats.learned })
                : t("review.newLearnedMany", { n: stats.learned })}
            </p>
          )}

          {missed.length > 0 && (
            <div className="card mt-6 p-4 text-left">
              <p className="eyebrow mb-2">{t("review.listenAgain")}</p>
              <ul className="space-y-2">
                {missed.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="font-medium">{m.content}</span>
                    <button onClick={() => say(m.content)} className="text-paper-faint transition hover:text-coral" aria-label={t("review.listenAria", { c: m.content })}>
                      <Volume2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-paper-faint">{t("review.comeBack")}</p>
            </div>
          )}

          {remaining > 0 ? (
            <button className="btn-coral mt-6 w-full" onClick={() => void start()}>
              {t("review.keepGoing", { n: remaining })}
            </button>
          ) : (
            <p className="mt-6 text-sm text-paper-faint">{t("review.allDone")}</p>
          )}
        </div>
      </>
    );
  }

  if (!entry) return null;

  return (
    <div className="animate-fade-up mx-auto max-w-lg">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-1">{entry.retry ? t("review.tryOnce") : t("review.review")}</p>
          <h1 className="font-display text-2xl font-extrabold">{t(KIND_KEY[entry.kind])}</h1>
        </div>
        <span className="font-mono text-sm text-paper-muted">
          {Math.min(pos + 1, queue.length)} / {queue.length}
        </span>
      </header>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-ink-600" aria-hidden>
        <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${progress}%` }} />
      </div>

      <CardBody key={`${entry.item.id}-${pos}`} entry={entry} say={say} onAnswer={onAnswer} answered={answered} t={t} accentFallback={accentFallback} />

      {answered && (
        <div className="mt-4 animate-fade-up space-y-3">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${answered.correct ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"}`}
          >
            {answered.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {answered.correct ? (entry.retry ? t("review.gotItNow") : t("review.correct")) : t("review.wrongAgain")}
          </div>
          <button className="btn-mint w-full py-3 text-base" onClick={() => void next()}>
            {pos + 1 < queue.length ? t("review.next") : t("review.finish")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tarjetas ─────────────────────────────────────────────────────────────────────

function SpanishHelper({ text, t }: { text: string; t: T }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <p className="mt-3 text-sm text-paper-muted">🇪🇸 {text}</p>
  ) : (
    <button onClick={() => setShown(true)} className="mt-3 text-xs text-paper-faint underline decoration-dotted transition hover:text-paper">
      {t("review.needSpanish")}
    </button>
  );
}

function SpeakerButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-coral text-ink-900 transition hover:bg-coral-soft"
      aria-label={label}
    >
      <Volume2 size={24} />
    </button>
  );
}

function CardBody({
  entry,
  say,
  onAnswer,
  answered,
  t,
  accentFallback,
}: {
  entry: Entry;
  say: (t: string) => void;
  onAnswer: (correct: boolean) => void;
  answered: { correct: boolean } | null;
  t: T;
  accentFallback: string;
}) {
  const { item, kind, meta } = entry;
  const [picked, setPicked] = useState<number | null>(null);
  const typeLabel = item.item_type === "chunk" ? t("review.phrase") : t("review.word");

  // Cada tarjeta empieza sonando sola (la persona ya tocó para llegar aquí).
  useEffect(() => {
    if (kind === "meet" || kind === "listen") {
      const tm = setTimeout(() => say(item.content), 250);
      return () => clearTimeout(tm);
    }
  }, [kind, item.content, say]);

  if (kind === "meet") {
    return (
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <SpeakerButton onClick={() => say(item.content)} label={t("review.listen")} />
          <div className="min-w-0">
            <p className="eyebrow mb-1">{typeLabel}</p>
            <p className="font-display text-2xl font-semibold leading-snug">{item.content}</p>
          </div>
        </div>
        {meta?.definition && <p className="mt-4 text-paper-muted">{meta.definition}</p>}
        {meta?.example && (
          <button onClick={() => say(meta.example)} className="mt-3 flex items-start gap-2 text-left text-sm italic text-paper-muted transition hover:text-paper">
            <Volume2 size={14} className="mt-0.5 shrink-0" /> “{meta.example}”
          </button>
        )}
        <SpanishHelper text={item.prompt} t={t} />
        {!answered && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="btn-ghost py-3" onClick={() => onAnswer(false)}>
              {t("review.showAgain")}
            </button>
            <button className="btn-mint py-3" onClick={() => onAnswer(true)}>
              {t("review.gotIt")}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (kind === "listen" && entry.listen) {
    const { options, correctIndex } = entry.listen;
    return (
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-4">
          <SpeakerButton onClick={() => say(item.content)} label={t("review.playAgain")} />
          <p className="text-paper-muted">{t("review.listenWhich")}</p>
        </div>
        <ul className="space-y-2">
          {options.map((o, i) => {
            const state =
              picked === null
                ? "border-ink-600 bg-ink-800 hover:bg-ink-700"
                : i === correctIndex
                ? "border-mint bg-mint/10"
                : i === picked
                ? "border-coral bg-coral/10"
                : "border-ink-600 bg-ink-800 opacity-60";
            return (
              <li key={`${o}-${i}`}>
                <button
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    onAnswer(i === correctIndex);
                  }}
                  className={`w-full rounded-xl border p-3 text-left font-medium transition ${state}`}
                >
                  {o}
                  {picked !== null && i === correctIndex && <span className="sr-only">{t("review.correctAnnot")}</span>}
                  {picked !== null && i === picked && i !== correctIndex && <span className="sr-only">{t("review.wrongAnnot")}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {picked !== null && meta?.definition && <p className="mt-4 text-sm text-paper-muted">{meta.definition}</p>}
        {picked !== null && <SpanishHelper text={item.prompt} t={t} />}
      </div>
    );
  }

  if (kind === "gap" && entry.gap) {
    const g = entry.gap;
    return (
      <div className="card p-6">
        <p className="mb-5 font-display text-xl font-semibold leading-relaxed">
          {g.before}
          <span className={`mx-1 inline-block min-w-[3.5rem] border-b-2 text-center ${picked === null ? "border-coral text-transparent" : answered?.correct ? "border-mint text-mint" : "border-coral text-coral"}`}>
            {picked === null ? "___" : g.answer}
          </span>
          {g.after}
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {g.options.map((o, i) => {
            const state =
              picked === null
                ? "border-ink-600 bg-ink-800 hover:bg-ink-700"
                : i === g.correctIndex
                ? "border-mint bg-mint/10"
                : i === picked
                ? "border-coral bg-coral/10"
                : "border-ink-600 bg-ink-800 opacity-60";
            return (
              <li key={`${o}-${i}`}>
                <button
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    onAnswer(i === g.correctIndex);
                    say(item.content);
                  }}
                  className={`w-full rounded-xl border p-3 text-center font-medium transition ${state}`}
                >
                  {o}
                  {picked !== null && i === g.correctIndex && <span className="sr-only">{t("review.correctAnnot")}</span>}
                  {picked !== null && i === picked && i !== g.correctIndex && <span className="sr-only">{t("review.wrongAnnot")}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {picked !== null && <SpanishHelper text={item.prompt} t={t} />}
      </div>
    );
  }

  // say
  return (
    <div className="card p-5">
      <p className="mb-1 eyebrow">{typeLabel}</p>
      <p className="mb-4 font-display text-2xl font-semibold leading-snug">{item.content}</p>
      <ShadowingBlock text={item.content} lang={accentFallback} label={t("review.listenThenSay")} onResult={(r) => onAnswer(r.ok || (r.score ?? 0) >= 70)} />
      {!answered && (
        <button className="btn-ghost mt-3 w-full text-sm" onClick={() => onAnswer(false)}>
          {t("review.skipSpeak")}
        </button>
      )}
      <SpanishHelper text={item.prompt} t={t} />
    </div>
  );
}
