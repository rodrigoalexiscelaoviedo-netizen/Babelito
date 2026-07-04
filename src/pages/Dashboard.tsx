import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Library,
  PencilLine,
  Drama,
  BarChart3,
  Flame,
  Target,
  CheckCircle2,
  Circle,
  Volume2,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel } from "../lib/errorTypes";
import { getTodayLesson, completeLesson, getStreak, type DailyLesson } from "../lib/dailyLesson";
import { lookupWord, type WordDefinition } from "../lib/dictionary";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";

interface Stats {
  sessions: number;
  topError: string | null;
  chunksLearned: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const voicePrefs = useVoicePrefs();
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState(0);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Which of the 3 daily tasks the user has checked off
  const [checked, setChecked] = useState({ chunk: false, convo: false, word: false });

  const allChecked = checked.chunk && checked.convo && checked.word;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: sessions }, { data: errs }, { count: learned }, todayLesson, streakCount] =
        await Promise.all([
          supabase.from("sessions").select("created_at").eq("user_id", profile.id),
          supabase.from("errors").select("error_type").eq("user_id", profile.id),
          supabase
            .from("user_chunks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id),
          getTodayLesson(profile.id),
          getStreak(profile.id),
        ]);

      let topError: string | null = null;
      if (errs && errs.length) {
        const tally: Record<string, number> = {};
        errs.forEach((e) => (tally[e.error_type] = (tally[e.error_type] ?? 0) + 1));
        topError = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      }

      setStats({ sessions: sessions?.length ?? 0, topError, chunksLearned: learned ?? 0 });
      setStreak(streakCount);
      setLesson(todayLesson);
      setLoadingLesson(false);

      // If word exists, look it up
      if (todayLesson.word) {
        lookupWord(todayLesson.word)
          .then(setWordDef)
          .catch(() => null);
      }
    })();
  }, [profile]);

  async function handleComplete() {
    if (!profile || !lesson) return;
    setCompleting(true);
    try {
      await completeLesson(profile.id);
      setLesson({ ...lesson, completed: true });
      setStreak((s) => s + 1);
    } finally {
      setCompleting(false);
    }
  }

  function toggle(key: keyof typeof checked) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening";

  const modules = [
    { to: "/conversation", label: "Talk to your coach", desc: "Live conversation with feedback", icon: MessageCircle, accent: "coral" },
    { to: "/roleplay", label: "Roleplay a scene", desc: "Interviews, calls, meetings", icon: Drama, accent: "mint" },
    { to: "/chunks", label: "Chunks library", desc: "Ready-made expressions", icon: Library, accent: "gold" },
    { to: "/correct", label: "Fix my writing", desc: "Paste an email or message", icon: PencilLine, accent: "coral" },
  ];

  return (
    <div className="animate-fade-up">
      <header className="mb-8">
        <p className="eyebrow mb-2">{greeting}</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold">
          {greeting}, {firstName}.
        </h1>
        <p className="text-paper-muted mt-1">Ready for a few minutes of English?</p>
      </header>

      {/* Daily practice card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Tu práctica de hoy</h2>
          <span className="flex items-center gap-1.5 text-coral font-display font-bold">
            <Flame size={16} className="text-coral" />
            {streak} {streak === 1 ? "day" : "days"}
          </span>
        </div>

        {loadingLesson ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-paper-muted" />
          </div>
        ) : lesson?.completed ? (
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="text-mint mx-auto mb-2" />
            <p className="font-display font-bold text-mint">All done for today!</p>
            <p className="text-xs text-paper-muted mt-1">Come back tomorrow to keep your streak.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Chunk of the day */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
              onClick={() => toggle("chunk")}
            >
              {checked.chunk ? (
                <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                  Chunk of the day
                </p>
                {lesson?.chunk_text ? (
                  <p className="font-medium leading-snug">{lesson.chunk_text}</p>
                ) : (
                  <p className="text-paper-muted text-sm">No chunk available.</p>
                )}
                <p className="text-xs text-paper-faint mt-1">Practise saying it out loud 3 times.</p>
              </div>
            </div>

            {/* Mini-conversation */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
              onClick={() => {
                toggle("convo");
                navigate("/conversation", { state: { topic: lesson?.topic } });
              }}
            >
              {checked.convo ? (
                <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                  Mini-conversation
                </p>
                <p className="font-medium leading-snug">{lesson?.topic ?? "Free chat"}</p>
                <p className="text-xs text-paper-faint mt-1">Tap to open your coach →</p>
              </div>
            </div>

            {/* Word of the day */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
              onClick={() => toggle("word")}
            >
              {checked.word ? (
                <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                  Word of the day
                </p>
                {lesson?.word ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold">{lesson.word}</p>
                      {wordDef?.phonetic && (
                        <span className="text-xs text-paper-muted font-mono">/{wordDef.phonetic}/</span>
                      )}
                      <button
                        className="text-paper-faint hover:text-coral transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(lesson.word!, {
                            voiceName: voicePrefs.voiceName ?? undefined,
                            rate: voicePrefs.voiceRate,
                            lang: voicePrefs.voiceAccent,
                          });
                        }}
                        aria-label="Pronounce"
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>
                    {wordDef?.definition_es && (
                      <p className="text-sm text-paper-muted mt-0.5">{wordDef.definition_es}</p>
                    )}
                    {wordDef?.example && (
                      <p className="text-xs text-paper-faint italic mt-0.5">"{wordDef.example}"</p>
                    )}
                  </>
                ) : (
                  <p className="text-paper-muted text-sm">
                    No learning word yet. Explore Reading or Stories to track words.
                  </p>
                )}
              </div>
            </div>

            <button
              className="btn-coral w-full mt-2 flex items-center justify-center gap-2"
              disabled={!allChecked || completing}
              onClick={handleComplete}
            >
              {completing ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : (
                "Complete today's practice ✓"
              )}
            </button>
            {!allChecked && (
              <p className="text-xs text-paper-faint text-center">
                Check all three tasks above to complete your practice.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Flame size={15} className="text-coral" />
            <span className="text-xs">Streak</span>
          </div>
          <p className="font-display text-2xl font-bold">
            {streak} <span className="text-sm font-normal text-paper-muted">days</span>
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Target size={15} className="text-mint" />
            <span className="text-xs">Level</span>
          </div>
          <p className="font-display text-2xl font-bold">{profile?.current_level ?? "—"}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <MessageCircle size={15} className="text-gold" />
            <span className="text-xs">Sessions</span>
          </div>
          <p className="font-display text-2xl font-bold">{stats?.sessions ?? 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Library size={15} className="text-mint" />
            <span className="text-xs">Chunks</span>
          </div>
          <p className="font-display text-2xl font-bold">{stats?.chunksLearned ?? 0}</p>
        </div>
      </div>

      {/* Coach nudge */}
      {stats?.topError && (
        <Link
          to="/conversation"
          className="card mb-8 flex items-center justify-between p-5 hover:border-coral/50 transition group"
        >
          <div>
            <p className="eyebrow mb-1 text-coral">Coach noticed</p>
            <p className="font-medium">
              You keep slipping on <strong>{errorLabel(stats.topError)}</strong>. Want to drill it
              in a quick chat?
            </p>
          </div>
          <span className="text-coral group-hover:translate-x-1 transition">→</span>
        </Link>
      )}

      {/* Modules */}
      <div className="grid sm:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="card p-6 hover:border-ink-500 transition group relative overflow-hidden"
          >
            <m.icon
              size={28}
              className={
                m.accent === "coral" ? "text-coral" : m.accent === "mint" ? "text-mint" : "text-gold"
              }
            />
            <h3 className="font-display text-lg font-bold mt-4">{m.label}</h3>
            <p className="text-sm text-paper-muted mt-1">{m.desc}</p>
            <span className="absolute right-5 bottom-5 text-paper-faint group-hover:text-paper transition">
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link to="/progress" className="inline-flex items-center gap-2 text-sm text-paper-muted hover:text-paper">
          <BarChart3 size={15} /> See your full progress
        </Link>
      </div>
    </div>
  );
}
