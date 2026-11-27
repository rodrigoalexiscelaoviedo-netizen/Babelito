import { useHistoryBack } from "../lib/useHistoryBack";
import { awardXp, storyXp } from "../lib/xp";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookText, ChevronLeft, ChevronRight, Pause, Play, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ShadowingBlock from "../components/ShadowingBlock";
import { splitSentences } from "../lib/sentences";
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
import { tFor } from "../i18n";

type T = ReturnType<typeof tFor>;
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

  const learningLanguage = profile?.learning_language || "en";
  const isCa = learningLanguage === "ca";
  const t = tFor(learningLanguage);

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
        (profile.profile_json?.interests as string) ?? undefined,
        isCa ? "ca" : "en"
      );
      setStories((prev) => [story, ...prev]);
      setActiveStory(story);
      setView("reading");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : t("stories.genFail"));
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
        t={t}
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
      <p className="eyebrow mb-2">{t("stories.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("stories.title")}</h1>
      <p className="text-paper-muted mb-8">{t("stories.intro")}</p>

      {/* Generador: disponible para inglés y catalán */}
      <div className="card p-5 mb-8">
        <h3 className="font-display font-bold mb-1">{t("stories.genTitle")}</h3>
        <p className="text-xs text-paper-muted mb-4">{t("stories.genSub")}</p>
        <div className="flex gap-3 mb-3">
          <input
            className="input flex-1"
            placeholder={t("stories.topicPlaceholder")}
            aria-label={t("stories.topicPlaceholder")}
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <select
            aria-label={t("stories.level")}
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
            <span className="flex items-center gap-2"><BrandDots /> {t("stories.generating")}</span>
          ) : (
            t("stories.genBtn")
          )}
        </button>
      </div>

      {/* Filters */}
      {stories.length > 0 && (
        <div className="mb-5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("stories.filterLevel")}>
            <span className="eyebrow mr-1">{t("stories.levelLabel")}</span>
            {["all", ...levelsPresent].map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                aria-pressed={levelFilter === l}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  levelFilter === l ? "bg-coral text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
                }`}
              >
                {l === "all" ? t("stories.all") : l}
              </button>
            ))}
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("stories.filterTopic")}>
              <span className="eyebrow mr-1">{t("stories.topicLabel")}</span>
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  aria-pressed={categoryFilter === c}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoryFilter === c ? "bg-mint text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
                  }`}
                >
                  {c === "all" ? t("stories.all") : categoryLabel(c as StoryCategory, isCa ? "ca" : "en")}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-paper-faint">
            {visible.length === 1 ? t("stories.storiesOne", { n: visible.length }) : t("stories.storiesMany", { n: visible.length })}
            {completedIds.size > 0 && ` · ${t("stories.storiesRead", { n: completedIds.size })}`}
          </p>
        </div>
      )}

      {/* Story cards */}
      {stories.length === 0 ? (
        <p className="text-paper-muted text-center py-12">{t("stories.noStories")}</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-paper-muted mb-3">{t("stories.noMatch")}</p>
          <button className="btn-ghost" onClick={() => { setLevelFilter("all"); setCategoryFilter("all"); }}>
            {t("stories.clearFilters")}
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
                  {story.topic} · {readingMinutes(story.content)} {t("stories.min")}
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

/** Shadowing por oración: elegís una oración, la escuchás, la repetís y pasás a la siguiente. */
function SentenceShadowing({ text, lang, t }: { text: string; lang: string; t: T }) {
  const sentences = splitSentences(text);
  const [index, setIndex] = useState(0);
  if (sentences.length === 0) return null;
  const current = sentences[Math.min(index, sentences.length - 1)];
  const last = sentences.length - 1;
  return (
    <section aria-label={t("stories.shadowSection")} className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow">{t("stories.shadowing")} · {index + 1} / {sentences.length}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label={t("stories.prevSentence")}
            className="grid h-8 w-8 place-items-center rounded-lg text-paper-muted hover:text-paper disabled:opacity-30 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(last, i + 1))}
            disabled={index >= last}
            aria-label={t("stories.nextSentence")}
            className="grid h-8 w-8 place-items-center rounded-lg text-paper-muted hover:text-paper disabled:opacity-30 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="text-sm mb-3 leading-relaxed">{current}</p>
      {/* La key reinicia el bloque (grabación y puntaje) al cambiar de oración. */}
      <ShadowingBlock key={index} text={current} lang={lang} label={t("stories.repeatSentence")} />
      <p className="text-[11px] text-paper-faint mt-2">{t("stories.shadowNote")}</p>
    </section>
  );
}

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
  const learningLanguage = profile?.learning_language || "en";
  const t = tFor(learningLanguage);
  const accentFallback = learningLanguage === "ca" ? "ca-ES" : "en-GB";
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
      lang: voicePrefs.voiceAccent ?? accentFallback,
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
              aria-label={paused ? t("reading.resumeNarr") : t("reading.pauseNarr")}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          <button
            onClick={handleSpeak}
            className="text-paper-faint hover:text-coral transition"
            aria-label={t("stories.readAloud")}
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      {/* Scroll progress */}
      <div className="h-1 w-full bg-ink-600 rounded-full mb-4">
        <div className="h-1 bg-coral rounded-full transition-[width] duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Hint */}
      <p className="text-xs text-paper-faint mb-3">
        <span className="text-gold/70 underline decoration-wavy underline-offset-2">{t("stories.gold")}</span> {t("stories.hint")}
      </p>

      {/* Text */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ClickableText
          text={story.content}
          vocabMap={vocabMap}
          userId={profile!.id}
          language={learningLanguage}
          voicePrefs={voicePrefs}
          source="story"
          highlightLearning
          onVocabUpdate={handleVocabUpdate}
        />
      </div>

      {/* Shadowing: practicá la historia oración por oración */}
      <div className="pt-3">
        <SentenceShadowing text={story.content} lang={voicePrefs.voiceAccent ?? accentFallback} t={t} />
      </div>

      {/* CTA */}
      <div className="pt-3">
        <button className="btn-coral w-full" onClick={onStartQuiz}>
          {t("stories.answerQ")}
        </button>
      </div>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function StoryQuiz({
  story,
  t,
  onFinish,
  onExit,
  onBackToText,
}: {
  story: Story;
  t: T;
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
        <p className="text-paper-muted">{t("stories.noQuestions")}</p>
        <button className="btn-coral mt-4" onClick={onExit}>
          {t("stories.backLibrary")}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="animate-fade-up max-w-xl mx-auto py-12 text-center">
        <p className="eyebrow mb-2">{t("stories.results")}</p>
        <p className="font-display text-6xl font-extrabold mb-2">{score}%</p>
        <p className="text-paper-muted mb-2">
          {t("stories.outOfCorrect", { a: answers.filter(Boolean).length, n: questions.length })}
        </p>
        {score >= 80 && (
          <div className="card p-4 mt-4 mb-6 border-mint/30">
            <p className="text-mint font-medium">{t("stories.excellent")}</p>
          </div>
        )}
        {score < 80 && (
          <div className="card p-4 mt-4 mb-6">
            <p className="text-paper-muted text-sm">{t("stories.goodEffort")}</p>
          </div>
        )}
        <p className="inline-flex items-center gap-1.5 rounded-full status-streak-bg px-3 py-1 text-sm font-semibold mb-6 level-up-pop">
          {t("stories.xpGain", { n: storyXp(score) })}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn-ghost flex-1" onClick={onBackToText}>
            {t("stories.readAgain")}
          </button>
          <button className="btn-coral flex-1" onClick={onExit}>
            {t("stories.backStories")}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="animate-fade-up max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="eyebrow">{t("stories.questionOf", { i: current + 1, n: questions.length })}</p>
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
          {current + 1 < questions.length ? t("stories.nextQuestion") : t("stories.seeResults")}
        </button>
      )}
    </div>
  );
}
