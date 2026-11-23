import { useHistoryBack } from "../lib/useHistoryBack";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Dumbbell, Volume2, Layers, Mic } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Chunk } from "../lib/types";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ShadowingBlock from "../components/ShadowingBlock";
import Loader from "../components/Loader";
import { addToReview } from "../lib/srs";
import { scopeByLanguage } from "../lib/language";
import { tFor } from "../i18n";

type T = ReturnType<typeof tFor>;

const CATEGORY_KEYS: Record<string, string> = {
  meetings: "chunks.catMeetings",
  opinion: "chunks.catOpinion",
  clarification: "chunks.catClarification",
  email: "chunks.catEmail",
  presentation: "chunks.catPresentation",
  buytime: "chunks.catBuytime",
};

export default function Chunks() {
  const { profile } = useAuth();
  const lang = profile?.learning_language || "en";
  const t = tFor(lang);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [inDeck, setInDeck] = useState<Set<number>>(new Set());
  const [cat, setCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState(false);
  useHistoryBack(drill, () => setDrill(false));

  useEffect(() => {
    if (!profile) return;
    const learningLanguage = profile.learning_language || "en";
    (async () => {
      const [{ data: ch }, { data: uc }, { data: ri }] = await Promise.all([
        scopeByLanguage(supabase.from("chunks").select("*"), learningLanguage).order("id"),
        supabase.from("user_chunks").select("chunk_id").eq("user_id", profile.id),
        scopeByLanguage(
          supabase.from("review_items").select("source_ref").eq("user_id", profile.id).eq("item_type", "chunk"),
          learningLanguage
        ),
      ]);
      setChunks((ch as Chunk[]) ?? []);
      setLearned(new Set((uc ?? []).map((r: { chunk_id: number }) => r.chunk_id)));
      setInDeck(new Set((ri ?? []).map((r: { source_ref: string }) => parseInt(r.source_ref, 10)).filter(Boolean)));
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

  async function handleAddReview(chunk: Chunk) {
    if (!profile) return;
    const result = await addToReview(
      profile.id,
      {
        item_type: "chunk",
        content: chunk.english,
        prompt: chunk.spanish,
        source_ref: String(chunk.id),
      },
      profile.learning_language || "en"
    );
    if (result !== "error") {
      setInDeck((prev) => new Set(prev).add(chunk.id));
    }
  }

  if (loading) return <Loader />;

  const categories = ["all", ...Object.keys(CATEGORY_KEYS)];
  const filtered = cat === "all" ? chunks : chunks.filter((c) => c.category === cat);

  if (drill) return <DrillMode chunks={filtered} onExit={() => setDrill(false)} t={t} lang={lang} />;

  return (
    <div className="animate-fade-up">
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="eyebrow mb-2">{t("chunks.eyebrow")}</p>
          <h1 className="page-title">{t("chunks.title")}</h1>
          <p className="text-paper-muted mt-1">
            {t("chunks.learnedCount", { a: learned.size, b: chunks.length })}
          </p>
        </div>
        <button className="btn-mint" onClick={() => setDrill(true)}>
          <Dumbbell size={16} /> {t("chunks.drill")}
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
            {c === "all" ? t("chunks.all") : t(CATEGORY_KEYS[c])}
          </button>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid sm:grid-cols-2 gap-4 stagger">
        {filtered.map((c) => (
          <FlipCard
            key={c.id}
            chunk={c}
            t={t}
            lang={lang}
            learned={learned.has(c.id)}
            inDeck={inDeck.has(c.id)}
            onToggle={() => toggleLearned(c.id)}
            onAddReview={() => handleAddReview(c)}
          />
        ))}
      </div>
    </div>
  );
}

function FlipCard({
  chunk,
  t,
  lang,
  learned,
  inDeck,
  onToggle,
  onAddReview,
}: {
  chunk: Chunk;
  t: T;
  lang: string;
  learned: boolean;
  inDeck: boolean;
  onToggle: () => void;
  onAddReview: () => void;
}) {
  const voicePrefs = useVoicePrefs();
  const accentFallback = lang === "ca" ? "ca-ES" : "en-GB";
  const [face, setFace] = useState(0); // 0 target, 1 source, 2 example, 3 variant
  const [showShadow, setShowShadow] = useState(false);

  const faces = [
    { tag: t("chunks.tagTarget"), body: chunk.english },
    { tag: t("chunks.tagSource"), body: chunk.spanish },
    { tag: t("chunks.tagExample"), body: chunk.example ?? "—" },
    { tag: t("chunks.tagVariant"), body: chunk.british_version ?? "—" },
  ];
  const f = faces[face];

  function handleListen(e: React.MouseEvent) {
    e.stopPropagation();
    speak(chunk.english, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent ?? accentFallback,
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

      {/* Action row — visible buttons for Listen and Repeat */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleListen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-600 hover:bg-ink-500 text-xs font-medium text-paper transition"
          aria-label={t("chunks.listen")}
        >
          <Volume2 size={13} className="text-coral" /> {t("chunks.listen")}
        </button>
        <button
          onClick={() => setShowShadow((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            showShadow ? "bg-mint/20 text-mint" : "bg-ink-600 hover:bg-ink-500 text-paper"
          }`}
        >
          <Mic size={13} /> {showShadow ? t("chunks.hide") : t("chunks.repeat")}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddReview(); }}
          disabled={inDeck}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            inDeck ? "bg-gold/20 text-gold cursor-default" : "bg-ink-600 hover:bg-ink-500 text-paper"
          }`}
          title={inDeck ? t("chunks.inDeck") : t("chunks.addDeck")}
        >
          <Layers size={13} /> {inDeck ? t("chunks.inReview") : t("chunks.addReview")}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setFace((face + 1) % faces.length)}
          className="text-paper-faint hover:text-paper transition"
          aria-label={t("chunks.flip")}
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={onToggle}
          aria-pressed={learned}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
            learned ? "bg-mint text-ink-900" : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          <Check size={13} /> {learned ? t("chunks.learned") : t("chunks.mark")}
        </button>
      </div>

      {/* Shadowing block (expandable) */}
      {showShadow && (
        <ShadowingBlock
          text={chunk.english}
          lang={voicePrefs.voiceAccent ?? accentFallback}
          label={t("chunks.listenRepeat")}
        />
      )}
    </div>
  );
}

/** Modo drill: muestra el español, el usuario escribe el inglés y se autoevalúa. */
function DrillMode({ chunks, onExit, t, lang }: { chunks: Chunk[]; onExit: () => void; t: T; lang: string }) {
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const accentFallback = lang === "ca" ? "ca-ES" : "en-GB";

  const pool = chunks.length ? chunks : [];
  const c = pool[i];

  if (!c || done) {
    return (
      <div className="animate-fade-up max-w-md mx-auto text-center pt-12">
        <p className="eyebrow mb-3">{t("chunks.drillComplete")}</p>
        <div className="font-display text-6xl font-extrabold text-mint mb-2">
          {score}/{pool.length}
        </div>
        <p className="text-paper-muted mb-8">{t("chunks.drillNice")}</p>
        <button className="btn-coral w-full" onClick={onExit}>
          {t("chunks.backLibrary")}
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
          {t("chunks.drillProgress", { i: i + 1, n: pool.length })}
        </p>
        <button className="text-sm text-paper-muted hover:text-paper" onClick={onExit}>
          {t("chunks.exit")}
        </button>
      </div>

      <div className="card p-6 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          {t("chunks.sayThis")}
        </span>
        <p className="font-display text-2xl font-semibold mt-2">{c.spanish}</p>
      </div>

      <textarea
        className="input min-h-[80px] resize-none mb-3"
        placeholder={t("chunks.typeChunk")}
        aria-label={t("chunks.typeChunk")}
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        disabled={reveal}
      />

      {!reveal ? (
        <button className="btn-coral w-full" onClick={() => setReveal(true)}>
          {t("chunks.reveal")}
        </button>
      ) : (
        <div className="animate-fade-up space-y-3">
          <div className="card border-mint/40 p-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-mint">{t("chunks.answer")}</span>
            <p className="font-display text-lg font-semibold mt-1">{c.english}</p>
            {c.british_version && (
              <p className="text-sm text-paper-muted mt-1">{t("chunks.britishLine", { v: c.british_version })}</p>
            )}
          </div>
          {/* Shadowing in drill reveal */}
          <ShadowingBlock text={c.english} label={t("chunks.sayNow")} lang={accentFallback} />
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={() => next(false)}>
              {t("chunks.missed")}
            </button>
            <button className="btn-mint" onClick={() => next(true)}>
              {t("chunks.got")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
