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
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel } from "../lib/errorTypes";
import { getTodayLesson, completeLesson, getStreakInfo, type DailyLesson } from "../lib/dailyLesson";
import { lookupWord, type WordDefinition } from "../lib/dictionary";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { countDue } from "../lib/srs";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import { BrandDots } from "../components/Loader";
import Maica, { type MaicaMood } from "../components/Maica";

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
  const [freezesLeft, setFreezesLeft] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebMsg, setCelebMsg] = useState("");
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Which of the 3 daily tasks the user has checked off
  const [reviewsDue, setReviewsDue] = useState(0);
  const [checked, setChecked] = useState({ chunk: false, convo: false, word: false });
  const [activeLast2Days, setActiveLast2Days] = useState(false);

  const allChecked = checked.chunk && checked.convo && checked.word;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: sessions }, { data: errs }, { count: learned }, todayLesson, streakInfo, due] =
        await Promise.all([
          supabase.from("sessions").select("created_at, completed").eq("user_id", profile.id),
          supabase.from("errors").select("error_type").eq("user_id", profile.id),
          supabase
            .from("user_chunks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id),
          getTodayLesson(profile.id),
          getStreakInfo(profile.id),
          countDue(profile.id),
        ]);

      let topError: string | null = null;
      if (errs && errs.length) {
        const tally: Record<string, number> = {};
        errs.forEach((e) => (tally[e.error_type] = (tally[e.error_type] ?? 0) + 1));
        topError = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      }

      setStats({ sessions: sessions?.length ?? 0, topError, chunksLearned: learned ?? 0 });
      setStreak(streakInfo.streak);
      setFreezesLeft(streakInfo.freezesLeft);

      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      type SessionRow = { created_at: string; completed: boolean };
      const activeLast2 = (sessions as SessionRow[] ?? []).some(
        (s) => s.completed && (s.created_at.slice(0, 10) === todayStr || s.created_at.slice(0, 10) === yesterdayStr)
      );
      setActiveLast2Days(activeLast2);
      const todayConvoDone = (sessions as SessionRow[] ?? []).some(
        (s) => s.completed && s.created_at.slice(0, 10) === todayStr
      );
      if (todayConvoDone) setChecked((prev) => ({ ...prev, convo: true }));

      // Check achievements on load (fire-and-forget)
      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
      setLesson(todayLesson);
      setReviewsDue(due);
      setLoadingLesson(false);

      // If word exists, look it up
      if (todayLesson.word) {
        lookupWord(todayLesson.word)
          .then(setWordDef)
          .catch(() => null);
      }
    })();
  }, [profile]);

  const CONGRATS = [
    "¡Práctica completa! Your English keeps growing. 💪",
    "Another day, another step toward fluency. Keep it up!",
    "¡Lo lograste! Consistency is the real secret to speaking well.",
    "One more day on your streak — you're building a real habit!",
    "¡Excelente trabajo! Every session counts. See you tomorrow.",
  ];

  async function handleComplete() {
    if (!profile || !lesson) return;
    setCompleting(true);
    try {
      await completeLesson(profile.id);
      setLesson({ ...lesson, completed: true });
      const newStreak = streak + 1;
      setStreak(newStreak);
      setCelebMsg(CONGRATS[Math.floor(Math.random() * CONGRATS.length)]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);

      // Check for newly unlocked achievements
      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
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

  const maicaMood: MaicaMood = lesson?.completed
    ? "celebrating"
    : !activeLast2Days && streak === 0 && (stats?.sessions ?? 0) > 0
    ? "sleeping"
    : "happy";

  const maicaText = lesson?.completed
    ? "¡Maica está orgullosa! 🐾"
    : !activeLast2Days && streak === 0 && (stats?.sessions ?? 0) > 0
    ? "Maica te extrañó 🐾"
    : "¡Maica te está esperando! 🐾";

  const modules = [
    { to: "/conversation", label: "Talk to your coach", desc: "Live conversation with feedback", icon: MessageCircle, accent: "coral" },
    { to: "/roleplay", label: "Roleplay a scene", desc: "Interviews, calls, meetings", icon: Drama, accent: "mint" },
    { to: "/chunks", label: "Chunks library", desc: "Ready-made expressions", icon: Library, accent: "gold" },
    { to: "/correct", label: "Fix my writing", desc: "Paste an email or message", icon: PencilLine, accent: "coral" },
  ];

  return (
    <div className="animate-fade-up">
      {/* ── Celebration overlay ── */}
      {showCelebration && (
        <>
          <style>{`
            @keyframes bbl-scale-up { from { transform: scale(0.75); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes bbl-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
            .bbl-celebrate { animation: bbl-scale-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
            .bbl-float { animation: bbl-float 1.8s ease-in-out infinite; }
          `}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(10,16,30,0.88)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowCelebration(false)}
          >
            <div className="card max-w-xs w-full mx-4 p-8 text-center bbl-celebrate">
              {/* Confetti strip */}
              <svg viewBox="0 0 260 48" className="w-full mb-2" aria-hidden="true">
                {[
                  { x: 10,  y: 18, r: 6,  fill: "#FF6B5E" },
                  { x: 35,  y: 8,  r: 4,  fill: "#36C5A8" },
                  { x: 60,  y: 28, r: 5,  fill: "#F7C948" },
                  { x: 90,  y: 12, r: 7,  fill: "#FF6B5E" },
                  { x: 120, y: 30, r: 4,  fill: "#36C5A8" },
                  { x: 148, y: 10, r: 6,  fill: "#F7C948" },
                  { x: 175, y: 24, r: 5,  fill: "#FF6B5E" },
                  { x: 205, y: 8,  r: 4,  fill: "#36C5A8" },
                  { x: 235, y: 32, r: 6,  fill: "#F7C948" },
                  { x: 255, y: 15, r: 3,  fill: "#FF6B5E" },
                ].map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.fill} opacity={0.85} />
                ))}
                {[
                  { x: 22, y: 36, w: 10, h: 5, fill: "#F7C948", rx: 2 },
                  { x: 108, y: 38, w: 8,  h: 4, fill: "#36C5A8", rx: 2 },
                  { x: 190, y: 40, w: 12, h: 5, fill: "#FF6B5E", rx: 2 },
                ].map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} rx={r.rx} opacity={0.8} />
                ))}
              </svg>

              {/* Maica celebrating + streak number */}
              <div className="bbl-float mb-1">
                <Maica mood="celebrating" size="md" className="mx-auto" />
              </div>
              <p className="font-display text-7xl font-extrabold text-coral leading-none mb-1">{streak}</p>
              <p className="font-display text-lg font-bold mb-4">{streak === 1 ? "day" : "days"} streak 🎉</p>

              {/* Message */}
              <p className="text-sm text-paper-muted leading-relaxed mb-4">{celebMsg}</p>

              {/* Freezes */}
              {freezesLeft > 0 && (
                <p className="text-xs text-paper-faint mb-3">❄️ {freezesLeft} freeze{freezesLeft !== 1 ? "s" : ""} available this month</p>
              )}

              <p className="text-xs text-paper-faint">Tap anywhere to continue</p>
            </div>
          </div>
        </>
      )}

      {/* ── Achievement celebration ── */}
      <AchievementCelebration
        achievements={newAchievements}
        onClose={() => {
          if (profile && newAchievements.length > 0) {
            markSeen(profile.id, newAchievements.map((a) => a.key));
          }
          setNewAchievements([]);
        }}
      />
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-2">{greeting}</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold">
            {greeting}, {firstName}.
          </h1>
          <p className="text-paper-muted mt-1">{maicaText}</p>
        </div>
        <Maica mood={maicaMood} size="md" className="shrink-0 mt-1" />
      </header>

      {/* Daily practice card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Tu práctica de hoy</h2>
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1.5 text-coral font-display font-bold">
              {streak > 0 && !lesson?.completed && (
                <span className="inline-block w-2 h-2 rounded-full bg-coral animate-pulse" title="Streak at risk" />
              )}
              <Flame size={16} className="text-coral" />
              {streak} {streak === 1 ? "day" : "days"}
            </span>
            {freezesLeft > 0 && (
              <span className="text-[10px] text-paper-faint">❄️ {freezesLeft} freeze{freezesLeft !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        {loadingLesson ? (
          <div className="flex justify-center py-6">
            <BrandDots size="md" />
          </div>
        ) : lesson?.completed ? (
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="text-mint mx-auto mb-2 animate-check-pop" />
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
                {lesson?.chunk?.english ? (
                  <>
                    <p className="font-medium leading-snug">{lesson.chunk.english}</p>
                    {lesson.chunk.spanish && (
                      <p className="text-xs text-paper-faint mt-0.5 italic">{lesson.chunk.spanish}</p>
                    )}
                  </>
                ) : lesson?.chunk_id ? (
                  <p className="font-medium leading-snug text-paper-muted">Loading chunk…</p>
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

            {reviewsDue > 0 && (
              <Link
                to="/review"
                className="flex items-center justify-between p-3 rounded-xl bg-gold/10 border border-gold/30 hover:border-gold/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-gold" />
                  <span className="text-sm font-medium text-gold">
                    {reviewsDue} review{reviewsDue !== 1 ? "s" : ""} due
                  </span>
                </div>
                <span className="text-xs text-gold/70">Practice now →</span>
              </Link>
            )}

            <button
              className="btn-coral w-full mt-2 flex items-center justify-center gap-2"
              disabled={!allChecked || completing}
              onClick={handleComplete}
            >
              {completing ? (
                <span className="flex items-center gap-2"><BrandDots /> Guardando…</span>
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
          {freezesLeft > 0 && (
            <p className="text-[10px] text-paper-faint mt-0.5">❄️ {freezesLeft}</p>
          )}
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
            className="card card-lift p-6 group relative overflow-hidden"
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
