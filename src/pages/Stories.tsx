import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookText, Loader2, Pause, Play, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { Level } from "../lib/types";
import {
  getStories,
  getStoryProgress,
  saveStoryProgress,
  generateStory,
  type Story,
  type StoryProgress,
  type StoryQuestion,
} from "../lib/stories";
import type { WordDefinition } from "../lib/dictionary";
import type { VocabMap, WordStatus } from "../lib/vocabulary";
import { speak, pauseSpeech, resumeSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ClickableText from "../components/ClickableText";
import Loader from "../components/Loader";

type View = "library" | "reading" | "quiz";

const LEVEL_BADGE: Record<string, string> = {
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-[#F4C431]",
  B2: "bg-coral/20 text-coral",
};

export default function Stories() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>("library");
  const [stories, setStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState<StoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Generate form state
  const [genTopic, setGenTopic] = useState("");
  const [genLevel, setGenLevel] = useState<Level>((profile?.current_level ?? "B1") as Level);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [s, p] = await Promise.all([
        getStories(profile.id),
        getStoryProgress(profile.id),
      ]);
      setStories(s);
      setProgress(p);
      setLoading(false);
    })();
  }, [profile]);

  function openStory(story: Story) {
    setActiveStory(story);
    setView("reading");
  }

  async function handleGenerate() {
    if (!genTopic.trim() || !profile) return;
    setGenerating(true);
    setGenError("");
    try {
      const story = await generateStory(
        genTopic.trim(),
        genLevel,
        (profile.profile_json?.interests as string) ?? undefined
      );
      setStories((prev) => [story, ...prev]);
      setActiveStory(story);
      setView("reading");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Could not generate story. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function completedProgress(storyId: string) {
    return progress.find((p) => p.story_id === storyId && p.completed);
  }

  if (loading) return <Loader />;

  if (view === "reading" && activeStory) {
    return (
      <StoryReader
        story={activeStory}
        onBack={() => setView("library")}
        onStartQuiz={() => setView("quiz")}
      />
    );
  }

  if (view === "quiz" && activeStory) {
    return (
      <StoryQuiz
        story={activeStory}
        onDone={async (score) => {
          if (profile) {
            await saveStoryProgress(profile.id, activeStory.id, score);
            setProgress((prev) => {
              const existing = prev.findIndex((p) => p.story_id === activeStory.id);
              const entry: StoryProgress = {
                id: "",
                user_id: profile.id,
                story_id: activeStory.id,
                completed: true,
                score,
                created_at: new Date().toISOString(),
              };
              if (existing >= 0) {
                const next = [...prev];
                next[existing] = entry;
                return next;
              }
              return [...prev, entry];
            });
          }
          setView("library");
        }}
      />
    );
  }

  // ─── Library view ─────────────────────────────────────────────────────────

  const levelOrder: Record<string, number> = { A2: 0, B1: 1, B2: 2 };
  const sorted = [...stories].sort((a, b) => (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9));

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Stories</p>
      <h1 className="font-display text-3xl font-extrabold mb-2">Reading stories</h1>
      <p className="text-paper-muted mb-8">
        Read, discover vocabulary, then test your comprehension. Your learning words appear highlighted.
      </p>

      {/* Generate block */}
      <div className="card p-5 mb-8">
        <h3 className="font-display font-bold mb-1">Generate a story</h3>
        <p className="text-xs text-paper-muted mb-4">
          Uses AI — generated with Gemini on Supabase Edge Function.
        </p>
        <div className="flex gap-3 mb-3">
          <input
            className="input flex-1"
            placeholder="Topic (e.g. a musician who starts a business)"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <select
            className="input w-24"
            value={genLevel}
            onChange={(e) => setGenLevel(e.target.value as Level)}
          >
            {["A2", "B1", "B2"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        {genError && <p className="text-coral text-sm mb-2">{genError}</p>}
        <button
          className="btn-coral w-full flex items-center justify-center gap-2"
          onClick={handleGenerate}
          disabled={generating || !genTopic.trim()}
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Generating…</>
          ) : (
            "Generate story →"
          )}
        </button>
      </div>

      {/* Story cards */}
      {sorted.length === 0 ? (
        <p className="text-paper-muted text-center py-12">
          No stories yet. Run seed_stories.sql in Supabase or generate one above.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sorted.map((story) => {
            const done = completedProgress(story.id);
            return (
              <button
                key={story.id}
                onClick={() => openStory(story)}
                className="card p-5 text-left hover:border-coral/50 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <BookText size={18} className="text-coral mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    {done && (
                      <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-mint/20 text-mint">
                        ✓ {done.score}%
                      </span>
                    )}
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${LEVEL_BADGE[story.level] ?? ""}`}>
                      {story.level}
                    </span>
                  </div>
                </div>
                <h3 className="font-display font-bold text-base leading-snug">{story.title}</h3>
                <p className="text-xs text-paper-muted mt-0.5">{story.topic}</p>
                <p className="text-xs text-paper-faint mt-2 line-clamp-2">{story.content.slice(0, 100)}…</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Story Reader ─────────────────────────────────────────────────────────────

function StoryReader({
  story,
  onBack,
  onStartQuiz,
}: {
  story: Story;
  onBack: () => void;
  onStartQuiz: () => void;
}) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [vocabMap, setVocabMap] = useState<VocabMap>({});
  const [loadingVocab, setLoadingVocab] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("user_vocabulary")
        .select("word, status, definition, example, phonetic")
        .eq("user_id", profile.id);
      if (data) {
        const map: VocabMap = {};
        for (const row of data as Array<{ word: string; status: WordStatus; definition?: string; example?: string; phonetic?: string }>) {
          map[row.word] = { status: row.status, definition: row.definition ?? undefined, example: row.example ?? undefined, phonetic: row.phonetic ?? undefined };
        }
        setVocabMap(map);
      }
      setLoadingVocab(false);
    })();
  }, [profile]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const max = scrollHeight - clientHeight;
      setScrollProgress(max > 0 ? Math.round((scrollTop / max) * 100) : 100);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function handleSpeak() {
    speak(story.content, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent,
    });
    setSpeaking(true);
    setPaused(false);
  }

  function handlePauseResume() {
    if (paused) {
      resumeSpeech();
      setPaused(false);
    } else {
      pauseSpeech();
      setPaused(true);
    }
  }

  function handleVocabUpdate(word: string, status: WordStatus, def: WordDefinition) {
    setVocabMap((prev) => ({
      ...prev,
      [word]: { status, definition: def.definition_es, example: def.example, phonetic: def.phonetic },
    }));
  }

  if (loadingVocab) return <Loader />;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="text-paper-muted hover:text-paper transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{story.title}</p>
          <p className="text-xs text-paper-muted">{story.topic} · {story.level}</p>
        </div>
        <div className="flex items-center gap-1">
          {speaking && (
            <button
              onClick={handlePauseResume}
              className="text-paper-faint hover:text-mint transition"
              aria-label={paused ? "Resume narration" : "Pause narration"}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          <button
            onClick={handleSpeak}
            className="text-paper-faint hover:text-coral transition"
            aria-label="Read aloud"
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      {/* Scroll progress */}
      <div className="h-1 w-full bg-ink-600 rounded-full mb-4">
        <div className="h-1 bg-coral rounded-full transition-all" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Hint */}
      <p className="text-xs text-paper-faint mb-3">
        <span className="text-[#F4C431]/70 underline decoration-wavy underline-offset-2">Underlined gold</span> = words you're learning. Click any word to look it up.
      </p>

      {/* Text */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ClickableText
          text={story.content}
          vocabMap={vocabMap}
          userId={profile!.id}
          voicePrefs={voicePrefs}
          source="story"
          highlightLearning
          onVocabUpdate={handleVocabUpdate}
        />
      </div>

      {/* CTA */}
      <div className="pt-3">
        <button className="btn-coral w-full" onClick={onStartQuiz}>
          Answer the questions →
        </button>
      </div>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function StoryQuiz({
  story,
  onDone,
}: {
  story: Story;
  onDone: (score: number) => void;
}) {
  const questions: StoryQuestion[] = story.questions ?? [];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  function handleSelect(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
  }

  function handleNext() {
    if (selected === null) return;
    const correct = selected === questions[current].correct_index;
    const nextAnswers = [...answers, correct];
    setAnswers(nextAnswers);
    setSelected(null);

    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  const score = finished
    ? Math.round((answers.filter(Boolean).length / questions.length) * 100)
    : 0;

  if (questions.length === 0) {
    return (
      <div className="animate-fade-up max-w-xl mx-auto text-center py-12">
        <p className="text-paper-muted">No questions available for this story.</p>
        <button className="btn-coral mt-4" onClick={() => onDone(100)}>
          Back to library
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="animate-fade-up max-w-xl mx-auto py-12 text-center">
        <p className="eyebrow mb-2">Results</p>
        <p className="font-display text-6xl font-extrabold mb-2">{score}%</p>
        <p className="text-paper-muted mb-2">
          {answers.filter(Boolean).length} out of {questions.length} correct
        </p>
        {score >= 80 && (
          <div className="card p-4 mt-4 mb-6 border-mint/30">
            <p className="text-mint font-medium">
              Excellent! You understood this story well. Consider trying a harder level next time.
            </p>
          </div>
        )}
        {score < 80 && (
          <div className="card p-4 mt-4 mb-6">
            <p className="text-paper-muted text-sm">
              Good effort! Re-reading the story and looking up unfamiliar words will help your score next time.
            </p>
          </div>
        )}
        <button className="btn-coral w-full" onClick={() => onDone(score)}>
          Back to stories
        </button>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="eyebrow">Question {current + 1} of {questions.length}</p>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition ${
                i < answers.length
                  ? answers[i] ? "bg-mint" : "bg-coral"
                  : i === current
                  ? "bg-paper-muted"
                  : "bg-ink-600"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="font-display text-xl font-bold mb-6 leading-snug">{q.question}</h2>

      <div className="space-y-3 mb-6">
        {q.options.map((option, i) => {
          let cls = "card w-full text-left p-4 transition font-medium ";
          if (selected === null) {
            cls += "hover:border-coral/50 cursor-pointer";
          } else if (i === q.correct_index) {
            cls += "border-mint bg-mint/10 text-mint";
          } else if (i === selected && selected !== q.correct_index) {
            cls += "border-coral bg-coral/10 text-coral";
          } else {
            cls += "opacity-50";
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null}>
              <span className="font-mono text-xs text-paper-faint mr-3">
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button className="btn-coral w-full" onClick={handleNext}>
          {current + 1 < questions.length ? "Next question →" : "See results →"}
        </button>
      )}
    </div>
  );
}
