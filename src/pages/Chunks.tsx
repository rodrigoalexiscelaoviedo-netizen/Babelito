import { useEffect, useState } from "react";
import { Check, RotateCcw, Dumbbell, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Chunk } from "../lib/types";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ShadowingBlock from "../components/ShadowingBlock";
import Loader from "../components/Loader";

const CATEGORY_LABELS: Record<string, string> = {
  meetings: "Meetings",
  opinion: "Opinions",
  clarification: "Clarifying",
  email: "Emails",
  presentation: "Presentations",
  buytime: "Buying time",
};

export default function Chunks() {
  const { profile } = useAuth();
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [cat, setCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: ch }, { data: uc }] = await Promise.all([
        supabase.from("chunks").select("*").order("id"),
        supabase.from("user_chunks").select("chunk_id").eq("user_id", profile.id),
      ]);
      setChunks((ch as Chunk[]) ?? []);
      setLearned(new Set((uc ?? []).map((r) => r.chunk_id)));
      setLoading(false);
    })();
  }, [profile]);

  async function toggleLearned(id: number) {
    if (!profile) return;
    const next = new Set(learned);
    if (next.has(id)) {
      next.delete(id);
      await supabase.from("user_chunks").delete().eq("user_id", profile.id).eq("chunk_id", id);
    } else {
      next.add(id);
      await supabase.from("user_chunks").upsert({ user_id: profile.id, chunk_id: id });
    }
    setLearned(next);
  }

  if (loading) return <Loader />;

  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];
  const filtered = cat === "all" ? chunks : chunks.filter((c) => c.category === cat);

  if (drill) return <DrillMode chunks={filtered} onExit={() => setDrill(false)} />;

  return (
    <div className="animate-fade-up">
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="eyebrow mb-2">Chunks library</p>
          <h1 className="font-display text-3xl font-extrabold">Ready-made expressions</h1>
          <p className="text-paper-muted mt-1">
            {learned.size} / {chunks.length} learned
          </p>
        </div>
        <button className="btn-mint" onClick={() => setDrill(true)}>
          <Dumbbell size={16} /> Drill
        </button>
      </header>

      {/* Progreso */}
      <div className="h-1.5 w-full rounded-full bg-ink-600 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-mint transition-all"
          style={{ width: `${chunks.length ? (learned.size / chunks.length) * 100 : 0}%` }}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              cat === c ? "bg-coral text-ink-900" : "bg-ink-600 text-paper-muted hover:text-paper"
            }`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <FlipCard
            key={c.id}
            chunk={c}
            learned={learned.has(c.id)}
            onToggle={() => toggleLearned(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FlipCard({ chunk, learned, onToggle }: { chunk: Chunk; learned: boolean; onToggle: () => void }) {
  const voicePrefs = useVoicePrefs();
  const [face, setFace] = useState(0); // 0 eng, 1 spa, 2 example, 3 british
  const [showShadow, setShowShadow] = useState(false);

  const faces = [
    { tag: "English", body: chunk.english },
    { tag: "Español", body: chunk.spanish },
    { tag: "Example", body: chunk.example ?? "—" },
    { tag: "British", body: chunk.british_version ?? "—" },
  ];
  const f = faces[face];

  function handleListen(e: React.MouseEvent) {
    e.stopPropagation();
    speak(chunk.english, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent ?? "en-GB",
    });
  }

  return (
    <div className={`card p-5 flex flex-col gap-3 ${learned ? "border-mint/40" : ""}`}>
      {/* Flip area */}
      <button className="text-left flex-1" onClick={() => setFace((face + 1) % faces.length)}>
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          {f.tag}
        </span>
        <p className={`mt-2 ${face === 0 ? "font-display text-lg font-semibold" : "text-paper"}`}>
          {f.body}
        </p>
      </button>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFace((face + 1) % faces.length)}
            className="text-paper-faint hover:text-paper transition"
            aria-label="Flip"
          >
            <RotateCcw size={15} />
          </button>
          {/* Listen button */}
          <button
            onClick={handleListen}
            className="flex items-center gap-1 text-xs text-paper-faint hover:text-coral transition"
            aria-label="Listen"
          >
            <Volume2 size={15} /> Listen
          </button>
          {/* Toggle shadowing */}
          <button
            onClick={() => setShowShadow((s) => !s)}
            className="text-xs text-paper-faint hover:text-mint transition"
          >
            {showShadow ? "Hide drill" : "Repeat"}
          </button>
        </div>
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
            learned ? "bg-mint text-ink-900" : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          <Check size={13} /> {learned ? "Learned" : "Mark learned"}
        </button>
      </div>

      {/* Shadowing block (expandable) */}
      {showShadow && (
        <ShadowingBlock
          text={chunk.english}
          lang={voicePrefs.voiceAccent ?? "en-GB"}
          label="Listen & repeat"
        />
      )}
    </div>
  );
}

/** Modo drill: muestra el español, el usuario escribe el inglés y se autoevalúa. */
function DrillMode({ chunks, onExit }: { chunks: Chunk[]; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pool = chunks.length ? chunks : [];
  const c = pool[i];

  if (!c || done) {
    return (
      <div className="animate-fade-up max-w-md mx-auto text-center pt-12">
        <p className="eyebrow mb-3">Drill complete</p>
        <div className="font-display text-6xl font-extrabold text-mint mb-2">
          {score}/{pool.length}
        </div>
        <p className="text-paper-muted mb-8">Nice work. Repetition is how chunks stick.</p>
        <button className="btn-coral w-full" onClick={onExit}>
          Back to library
        </button>
      </div>
    );
  }

  function next(correct: boolean) {
    if (correct) setScore((s) => s + 1);
    setReveal(false);
    setGuess("");
    if (i + 1 >= pool.length) setDone(true);
    else setI(i + 1);
  }

  return (
    <div className="animate-fade-up max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="eyebrow">
          Drill {i + 1} / {pool.length}
        </p>
        <button className="text-sm text-paper-muted hover:text-paper" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="card p-6 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          Say this in English
        </span>
        <p className="font-display text-2xl font-semibold mt-2">{c.spanish}</p>
      </div>

      <textarea
        className="input min-h-[80px] resize-none mb-3"
        placeholder="Type the English chunk…"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        disabled={reveal}
      />

      {!reveal ? (
        <button className="btn-coral w-full" onClick={() => setReveal(true)}>
          Reveal answer
        </button>
      ) : (
        <div className="animate-fade-up space-y-3">
          <div className="card border-mint/40 p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-mint">Answer</span>
            <p className="font-display text-lg font-semibold mt-1">{c.english}</p>
            {c.british_version && (
              <p className="text-sm text-paper-muted mt-1">British: {c.british_version}</p>
            )}
          </div>
          {/* Shadowing in drill reveal */}
          <ShadowingBlock text={c.english} label="Say it now" />
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={() => next(false)}>
              Missed it
            </button>
            <button className="btn-mint" onClick={() => next(true)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
