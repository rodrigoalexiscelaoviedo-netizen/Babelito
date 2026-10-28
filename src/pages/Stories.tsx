import { useHistoryBack } from "../lib/useHistoryBack";
import { awardXp, storyXp } from "../lib/xp";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookText, Pause, Play, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ShadowingBlock from "../components/ShadowingBlock";
import type { Level } from "../lib/types";
import { LEVELS, categoryLabel, presentCategories, readingMinutes, sortForLearner, storyCategory, type StoryCategory } from "../lib/storyLibrary";
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
import { scopeByLanguage } from "../lib/language";
import { speak, pauseSpeech, resumeSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ClickableText from "../components/ClickableText";
import Loader from "../components/Loader";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { BrandDots } from "../components/Loader";

type View = "library" | "reading" | "quiz";

const LEVEL_BADGE: Record<string, string> = {
  A1: "bg-mint/20 text-mint",
  C1: "bg-coral/20 text-coral",
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-gold",
  B2: "bg-coral/20 text-coral",
};

export default function Stories() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>("library");
  const [stories, setStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState<StoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  useHistoryBack(view !== "library", () => setView("library"));

  // Generate form state
  const [genTopic, setGenTopic] = useState("");
  const [genLevel, setGenLevel] = useState<Level>((profile?.current_level ?? "B1") as Level);
  const [generating, setGenerating] = useState(false);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [genError, setGenError] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [s, p] = await Promise.all([
        getStories(profile.id, profile.learning_language || "en"),
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
        onBackToText={() => setView("reading")}
        onExit={() => setView("library")}
        onFinish={async (score) => {
          if (profile) {
            await saveStoryProgress(profile.id, activeStory.id, score);
            void awardXp(profile.id, { source: "story", refKey: `story:${activeStory.id}`, amount: storyXp(score), meta: { score } });
            checkAchievements(profile.id).then((newly) => {
              if (newly.length > 0) setNewAchievements(newly);
            });
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
        }}
      />
    );
  }

  // ─── Library view ─────────────────────────────────────────────────────────

  const isCa = (profile?.learning_language || "en") === "ca";
  const ui = (en: string, ca: string) => (isCa ? ca : en);
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.story_id));
  const levelsPresent = LEVELS.filter((l) => stories.some((st) => st.level === l));
  const categories = presentCategories(stories.map((st) => st.topic));
  const visible = sortForLearner(stories, profile?.current_level, completedIds).filter(
    (st) =>
      (levelFilter === "all" || st.level === levelFilter) &&
      (categoryFilter === "all" || storyCategory(st.topic) === categoryFilter)
  );

  return (
    <div className="animate-fade-up">
      <AchievementCelebration
        achievements={newAchievements}
        onClose={() => {
          if (profile) markSeen(profile.id, newAchievements.map((a) => a.key));
          setNewAchievements([]);
        }}
      />
      <p className="eyebrow mb-2">Stories</p>
      <h1 className="page-title mb-2">Reading stories</h1>
      <p className="text-paper-muted mb-8">
        Read, discover vocabulary, then test your comprehension. Your learning words appear highlighted.
      </p>

      {/* Generate block — English only for now, generator prompt isn't multilingual yet */}
      {(profile?.learning_language || "en") === "en" && (
        <div className="card p-5 mb-8">
          <h3 className="font-display font-bold mb-1">Generate a story</h3>
          <p className="text-xs text-paper-muted mb-4">
            Pick a topic you like and the coach writes a story at your level.
          </p>
          <div className="flex gap-3 mb-3">
            <input
              className="input flex-1"
              placeholder="Topic (e.g. a musician who starts a business)" aria-label="Topic (e.g. a musician who starts a business)"
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <select
              className="input w-24"
              value={genLevel}
              onChange={(e) => setGenLevel(e.target.value as Level)}
            >
              {LEVELS.map((l) => (
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
              <span className="flex items-center gap-2"><BrandDots /> Generating…</span>
            ) : (
              "Generate story →"
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      {stories.length > 0 && (
        <div className="mb-5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ui("Filter by level", "Filtra per nivell")}>
            <span className="eyebrow mr-1">{ui("Level", "Nivell")}</span>
            {["all", ...levelsPresent].map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                aria-pressed={levelFilter === l}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  levelFilter === l ? "bg-coral text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
                }`}
              >
                {l === "all" ? ui("All", "Tots") : l}
              </button>
            ))}
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ui("Filter by topic", "Filtra per tema")}>
              <span className="eyebrow mr-1">{ui("Topic", "Tema")}</span>
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  aria-pressed={categoryFilter === c}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoryFilter === c ? "bg-mint text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
                  }`}
                >
                  {c === "all" ? ui("All", "Tots") : categoryLabel(c as StoryCategory, isCa ? "ca" : "en")}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-paper-faint">
            {visible.length} {isCa ? (visible.length === 1 ? "història" : "històries") : visible.length === 1 ? "story" : "stories"}
            {completedIds.size > 0 && ` · ${completedIds.size} ${ui("read", "llegides")}`}
          </p>
        </div>
      )}

      {/* Story cards */}
      {stories.length === 0 ? (
        <p className="text-paper-muted text-center py-12">
          {ui("No stories yet. Write one with the generator above and it will show up here.", "Encara no hi ha històries.")}
        </p>
      ) : visible.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-paper-muted mb-3">{ui("No stories match these filters.", "Cap història coincideix amb aquests filtres.")}</p>
          <button className="btn-ghost" onClick={() => { setLevelFilter("all"); setCategoryFilter("all"); }}>
            {ui("Clear filters", "Treu els filtres")}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 stagger">
          {visible.map((story) => {
            const done = completedProgress(story.id);
            return (
              <button
                key={story.id}
                onClick={() => openStory(story)}
                className="card-interactive p-5 text-left"
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
                <p className="text-xs text-paper-muted mt-0.5">
                  {story.topic} · {readingMinutes(story.content)} {ui("min", "min")}
                </p>
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
  const { t } = useTranslation();
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
      const { data } = await scopeByLanguage(
        supabase.from("user_vocabulary").select("*").eq("user_id", profile.id),
        profile.learning_language || "en"
      );
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

  function handleVocabUpdate(word: string, status: WordStatus, def: WordDefinition | null) {
    setVocabMap((prev) => ({
      ...prev,
      [word]: { status, definition: def?.definition_es, example: def?.example, phonetic: def?.phonetic },
    }));
  }

  if (loadingVocab) return <Loader />;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} aria-label={t("common.back")} className="text-paper-muted hover:text-paper transition">
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
        <span className="text-gold/70 underline decoration-wavy underline-offset-2">Underlined gold</span> = words you're learning. Click any word to look it up.
      </p>

      {/* Text */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ClickableText
          text={story.content}
          vocabMap={vocabMap}
          userId={profile!.id}
          language={profile?.learning_language || "en"}
          voicePrefs={voicePrefs}
          source="story"
          highlightLearning
          onVocabUpdate={handleVocabUpdate}
        />
      </div>

      {/* Shadowing block — first sentence of story */}
      <div className="pt-3">
        <ShadowingBlock
          text={story.content.match(/[^.!?]*[.!?]/)?.[0]?.trim() ?? story.content.split(" ").slice(0, 10).join(" ")}
          lang={voicePrefs.voiceAccent ?? "en-GB"}
          label="Shadowing practice"
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
  onFinish,
  onExit,
  onBackToText,
}: {
  story: Story;
  /** Se llama UNA vez al terminar: guarda progreso y XP aunque la persona salga por el menú. */
  onFinish: (score: number) => void | Promise<void>;
  onExit: () => void;
  onBackToText: () => void;
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

  const savedRef = useRef(false);
  useEffect(() => {
    if (!finished || savedRef.current) return;
    savedRef.current = true;
    void onFinish(score);
    // onFinish cambia en cada render; solo debe correr al terminar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (questions.length === 0) {
    return (
      <div className="animate-fade-up max-w-xl mx-auto text-center py-12">
        <p className="text-paper-muted">No questions available for this story.</p>
        <button className="btn-coral mt-4" onClick={onExit}>
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
        <p className="inline-flex items-center gap-1.5 rounded-full status-streak-bg px-3 py-1 text-sm font-semibold mb-6 level-up-pop">
          +{storyXp(score)} XP
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-ghost flex-1" onClick={onBackToText}>
            Read it again
          </button>
          <button className="btn-coral flex-1" onClick={onExit}>
            Back to stories
          </button>
        </div>
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
