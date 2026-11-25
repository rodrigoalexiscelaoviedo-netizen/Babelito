import { useState } from "react";
import { Check, Layers, Loader2, Mic, Sparkles, X } from "lucide-react";
import ShadowingBlock from "./ShadowingBlock";
import MultipleChoiceQuiz from "./MultipleChoiceQuiz";
import { errorLabel } from "../lib/errorTypes";
import { generateDrill, type ExerciseItem } from "../lib/mistakes";
import { addToReview } from "../lib/srs";
import type { CallReviewData, Mistake, ScoreRecord, Scores } from "../lib/liveReview";
import type { ChatTurn } from "../lib/types";

const SCORE_ROWS: Array<{ key: keyof Scores; label: string }> = [
  { key: "grammar", label: "Grammar" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "fluency", label: "Fluency" },
];

export interface CallReviewState {
  status: "idle" | "loading" | "done" | "error";
  turns: ChatTurn[];
  data: CallReviewData | null;
  /** Errores a mostrar: los de la revisión o, si falló, las correcciones de la llamada. */
  mistakes: Mistake[];
  previous: ScoreRecord[];
  saved: "saving" | "saved" | "failed" | null;
}

export const EMPTY_REVIEW: CallReviewState = { status: "idle", turns: [], data: null, mistakes: [], previous: [], saved: null };

/** La llamada frase por frase: qué dijiste, cómo decirlo mejor, repetirlo y practicarlo. Solo inglés. */
export default function CallReview({ userId, level, review }: { userId: string; level: string; review: CallReviewState }) {
  // Una sola grabación abierta a la vez: el micrófono es uno.
  const [speaking, setSpeaking] = useState<number | null>(null);
  const { status, turns, data, mistakes, previous, saved } = review;

  if (status === "idle") return null;
  if (status === "loading") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-paper-muted" role="status">
        <Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden /> Going through your call line by line…
      </div>
    );
  }

  const last = previous[previous.length - 1];
  const loose = mistakes.map((m, i) => ({ m, i })).filter(({ m }) => m.turn === null);
  const types = countTypes(mistakes);

  const card = (m: Mistake, i: number) => (
    <MistakeCard
      key={i}
      userId={userId}
      mistake={m}
      open={speaking === i}
      onToggle={() => setSpeaking(speaking === i ? null : i)}
    />
  );

  return (
    <div className="mt-6 space-y-6 text-left">
      {status === "error" && (
        <p className="text-sm text-coral" role="alert">
          We couldn't review the call line by line.{mistakes.length > 0 ? " These are the corrections from the call." : ""}
        </p>
      )}

      {data?.scores && (
        <section aria-label="Call scores">
          <p className="eyebrow mb-2">Scores for this call</p>
          <dl className="grid grid-cols-3 gap-2">
            {SCORE_ROWS.map(({ key, label }) => {
              const delta = last ? data.scores![key] - last[key] : null;
              return (
                <div key={key} className="rounded-xl bg-ink-800 p-3 text-center">
                  <dt className="text-[11px] text-paper-muted">{label}</dt>
                  <dd className="font-mono text-lg font-bold">{data.scores![key]}</dd>
                  {delta !== null && (
                    <dd className={`font-mono text-[11px] ${delta > 0 ? "text-mint" : delta < 0 ? "text-coral" : "text-paper-faint"}`}>
                      {delta > 0 ? `+${delta}` : delta} vs last
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
          {data.scoreNote && <p className="mt-2 text-xs text-paper-muted">{data.scoreNote}</p>}
          <p className="mt-1 text-[11px] text-paper-faint">
            AI estimate out of 100 from the transcript. Pronunciation isn't scored here: use "Say it better".
          </p>
        </section>
      )}
      {data && !data.scores && <p className="text-xs text-paper-faint">Too little speech to score this call.</p>}

      {status === "done" && turns.length > 0 && (
        <section aria-label="Your call, line by line">
          <p className="eyebrow mb-2">Your call, line by line</p>
          {mistakes.length === 0 && <p className="mb-2 text-sm text-mint">No mistakes worth flagging. Nice work.</p>}
          <ol className="space-y-2">
            {turns.map((turn, index) => {
              const here = mistakes.map((m, i) => ({ m, i })).filter(({ m }) => m.turn === index);
              return turn.role === "assistant" ? (
                <li key={index} className="pr-8 text-sm text-paper-muted">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">Coach </span>
                  {turn.content}
                </li>
              ) : (
                <li key={index} className={`rounded-lg p-3 text-sm ${here.length ? "border border-coral/40 bg-ink-800" : "bg-ink-800"}`}>
                  <p>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">You </span>
                    {turn.content}
                  </p>
                  {here.length > 0 && <div className="mt-2 space-y-3">{here.map(({ m, i }) => card(m, i))}</div>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {loose.length > 0 && (
        <section aria-label="Corrections">
          <div className="space-y-3">{loose.map(({ m, i }) => <div key={i} className="rounded-lg bg-ink-800 p-3 text-sm">{card(m, i)}</div>)}</div>
        </section>
      )}

      {types.length > 0 && <Practise level={level} types={types} />}

      {saved && (
        <p className={`text-center text-xs ${saved === "failed" ? "text-coral" : "text-paper-faint"}`} role="status">
          {saved === "saving" && "Saving your call…"}
          {saved === "saved" && (mistakes.length ? "Call saved. These mistakes are now in My mistakes." : "Call saved.")}
          {saved === "failed" && "We couldn't save this call, so it won't show in My mistakes."}
        </p>
      )}
    </div>
  );
}

/** Los tipos de error de la llamada, del más repetido al menos ("other" no sirve para practicar). */
function countTypes(mistakes: Mistake[]): string[] {
  const tally = new Map<string, number>();
  for (const m of mistakes) if (m.type !== "other") tally.set(m.type, (tally.get(m.type) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
}

function MistakeCard({ userId, mistake, open, onToggle }: { userId: string; mistake: Mistake; open: boolean; onToggle: () => void }) {
  const [deck, setDeck] = useState<"idle" | "saving" | "added" | "error">("idle");

  async function add() {
    setDeck("saving");
    const result = await addToReview(
      userId,
      { item_type: "chunk", content: mistake.better, prompt: mistake.why, source_ref: `live:${mistake.better.toLowerCase().slice(0, 120)}` },
      "en"
    );
    setDeck(result === "error" ? "error" : "added");
  }

  return (
    <div>
      {mistake.turn === null && <p className="text-paper-faint line-through">{mistake.said}</p>}
      {mistake.turn !== null && (
        <p className="text-xs text-paper-muted">
          Instead of <span className="line-through decoration-coral/70">{mistake.said}</span>
        </p>
      )}
      <p className="font-semibold text-mint">{mistake.better}</p>
      <p className="mt-1 text-xs text-paper-muted">
        {mistake.type !== "other" && (
          <span className="mr-1.5 inline-block rounded bg-ink-600 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
            {errorLabel(mistake.type)}
          </span>
        )}
        {mistake.why}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onToggle} aria-expanded={open} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
          {open ? <X size={13} aria-hidden /> : <Mic size={13} aria-hidden />} {open ? "Close" : "Say it better"}
        </button>
        <button
          type="button"
          onClick={add}
          disabled={deck === "saving" || deck === "added"}
          className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
        >
          {deck === "added" ? <Check size={13} aria-hidden /> : <Layers size={13} aria-hidden />}
          {deck === "added" ? "In your review" : deck === "error" ? "Try adding again" : "Add to review"}
        </button>
      </div>
      {open && (
        <div className="mt-2">
          <ShadowingBlock text={mistake.better} label="Say it better" />
        </div>
      )}
    </div>
  );
}

/** Ejercicios sobre los errores de esta llamada. */
function Practise({ level, types }: { level: string; types: string[] }) {
  const [drill, setDrill] = useState<{ type: string; items: ExerciseItem[]; round: number } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function start(type: string) {
    setLoading(type);
    const res = await generateDrill(type, level, "en");
    setLoading(null);
    setDrill({ type, items: res.items, round: (drill?.round ?? 0) + 1 });
  }

  return (
    <section aria-label="Practise these mistakes">
      <p className="eyebrow mb-2">Practise these mistakes</p>
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => start(type)}
            disabled={loading !== null}
            aria-pressed={drill?.type === type}
            className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
          >
            {loading === type ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles size={14} aria-hidden />}
            {errorLabel(type)}
          </button>
        ))}
      </div>
      {drill && (
        <div className="mt-3 rounded-lg bg-ink-800 p-3">
          <MultipleChoiceQuiz key={drill.round} items={drill.items} onFinish={() => {}} onRetry={() => start(drill.type)} retryLabel="New exercises" />
        </div>
      )}
    </section>
  );
}
