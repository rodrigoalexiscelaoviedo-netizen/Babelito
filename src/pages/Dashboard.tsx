import { BRAND } from "../lib/theme";
import XpCard from "../components/XpCard";
import HomeNudges from "../components/HomeNudges";
import { awardXp, storyXp, reviewXp, DAILY_LESSON_XP, dailyLessonRefKey } from "../lib/xp";
import { consolidateLevel } from "../lib/leveling";
import { localDateISO, addLocalDays, timestampToLocalDate } from "../lib/dates";
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
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel } from "../lib/errorTypes";
import { MIN_USER_TURNS } from "../lib/practice";
import {
  getTodayLesson,
  completeLesson,
  setLessonItem,
  getStreakInfo,
  activeItems,
  isTriadComplete,
  type DailyLesson,
  type LessonItem,
} from "../lib/dailyLesson";
import { lookupWord, dictLang, type WordDefinition } from "../lib/dictionary";
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
  const { profile, refreshProfile } = useAuth();

  // Re-leveling: una consolidación por día al entrar a Inicio (ver lib/leveling.ts).
  useEffect(() => {
    if (!profile?.diagnostic_complete || profile.level_updated_on === localDateISO()) return;
    consolidateLevel(profile)
      .then((r) => { if (r.changed) void refreshProfile(); })
      .catch((err) => console.warn("[leveling]", err));
  }, [profile?.id, profile?.diagnostic_complete, profile?.level_updated_on]);
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

  const [reviewsDue, setReviewsDue] = useState(0);
  const [activeLast2Days, setActiveLast2Days] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [itemError, setItemError] = useState("");
  const [savingItem, setSavingItem] = useState<LessonItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Los tildes se DERIVAN de la fila de hoy — sin estado local paralelo.
  const items: LessonItem[] = lesson ? activeItems(lesson) : [];
  const doneCount = lesson ? items.filter((k) => lesson[k]).length : 0;
  const allChecked = lesson ? isTriadComplete(lesson) : false;

  const learningLanguage = profile?.learning_language || "en";

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoadError("");
      try {
        const [{ data: sessions }, { data: errs }, { count: learned }, todayLesson, streakInfo, due] =
          await Promise.all([
            supabase.from("sessions").select("created_at, completed").eq("user_id", profile.id),
            supabase.from("errors").select("error_type").eq("user_id", profile.id),
            supabase
              .from("user_chunks")
              .select("id", { count: "exact", head: true })
              .eq("user_id", profile.id),
            getTodayLesson(profile.id, learningLanguage),
            // Vista de lectura: NUNCA consumir freezes al abrir el Home.
            getStreakInfo(profile.id, false),
            countDue(profile.id, learningLanguage),
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

        const todayStr = localDateISO();
        const yesterdayStr = addLocalDays(-1);
        type SessionRow = { created_at: string; completed: boolean };
        const rows = (sessions as SessionRow[]) ?? [];
        setActiveLast2Days(
          rows.some(
            (s) =>
              s.completed &&
              (timestampToLocalDate(s.created_at) === todayStr || timestampToLocalDate(s.created_at) === yesterdayStr)
          )
        );

        // La mini-conversación se deriva de que exista una sesión de hoy ya
        // registrada; si es así se persiste el tilde (sin toggle optimista).
        let lessonToShow = todayLesson;
        const todayConvoDone = rows.some(
          (s) => s.completed && timestampToLocalDate(s.created_at) === todayStr
        );
        if (todayConvoDone && !todayLesson.convo_done) {
          try {
            const updated = await setLessonItem(profile.id, learningLanguage, "convo_done", true);
            lessonToShow = { ...updated, chunk: todayLesson.chunk };
          } catch {
            /* no bloquear el Home por esto */
          }
        }

        checkAchievements(profile.id).then((newly) => {
          if (newly.length > 0) setNewAchievements(newly);
        });
        setLesson(lessonToShow);
        setReviewsDue(due);

        if (lessonToShow.word) {
          lookupWord(lessonToShow.word, dictLang(profile.learning_language)).then(setWordDef).catch(() => null);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar tu práctica de hoy.");
      } finally {
        // Pase lo que pase, el Home sale del estado "cargando".
        setLoadingLesson(false);
      }
    })();
  }, [profile, reloadKey]);

  function getCongratsForLanguage(lang: "en" | "ca") {
    if (lang === "ca") {
      return [
        "¡Pràctica completa! El teu català segueix creixent. 💪",
        "Un dia més, un pas més cap a la fluïdesa. Continua!",
        "¡Ho aconseguires! La consistència és la clau per parlar bé.",
        "Un dia més a la teva racha — estàs construint un hàbit real!",
        "¡Excel·lent treball! Cada sessió compta. Fins demà!",
      ];
    }
    return [
      "¡Práctica completa! Your English keeps growing. 💪",
      "Another day, another step toward fluency. Keep it up!",
      "¡Lo lograste! Consistency is the real secret to speaking well.",
      "One more day on your streak — you're building a real habit!",
      "¡Excelente trabajo! Every session counts. See you tomorrow.",
    ];
  }

  const CONGRATS = getCongratsForLanguage(learningLanguage as "en" | "ca");

  async function handleComplete() {
    if (!profile || !lesson) return;
    setCompleting(true);
    setItemError("");
    try {
      const updated = await completeLesson(profile.id, learningLanguage);
      void awardXp(profile.id, { source: "daily_lesson", refKey: dailyLessonRefKey(), amount: DAILY_LESSON_XP });
      setLesson({ ...updated, chunk: lesson.chunk });

      // Único punto donde se consumen los freezes, y se relee la racha real
      // en vez de sumar 1 a ciegas (el día podía contar ya por una sesión).
      const info = await getStreakInfo(profile.id, true);
      setStreak(info.streak);
      setFreezesLeft(info.freezesLeft);

      setCelebMsg(CONGRATS[Math.floor(Math.random() * CONGRATS.length)]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);

      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
    } catch (e) {
      setItemError(e instanceof Error ? e.message : "No se pudo guardar tu práctica.");
    } finally {
      setCompleting(false);
    }
  }

  /** Persiste el tilde en daily_lessons; la UI se deriva de la fila fresca. */
  async function toggleItem(key: LessonItem) {
    if (!profile || !lesson || savingItem) return;
    setSavingItem(key);
    setItemError("");
    try {
      const updated = await setLessonItem(profile.id, learningLanguage, key, !lesson[key]);
      setLesson({ ...updated, chunk: lesson.chunk });
    } catch (e) {
      setItemError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
    } finally {
      setSavingItem(null);
    }
  }

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = learningLanguage === "ca"
    ? (hour < 12 ? "Bon dia" : hour < 19 ? "Bona tarda" : "Bona nit")
    : (hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening");

  const maicaMood: MaicaMood = lesson?.completed
    ? "celebrating"
    : !activeLast2Days && streak === 0 && (stats?.sessions ?? 0) > 0
    ? "sleeping"
    : "happy";

  const isCa = learningLanguage === "ca";
  const maicaText = lesson?.completed
    ? (isCa ? "La Maica està orgullosa! 🐾" : "Maica is proud of you! 🐾")
    : !activeLast2Days && streak === 0 && (stats?.sessions ?? 0) > 0
    ? (isCa ? "La Maica et trobava a faltar 🐾" : "Maica missed you 🐾")
    : (isCa ? "La Maica t'espera! 🐾" : "Maica is waiting for you! 🐾");

  const modules = learningLanguage === "ca" ? [
    { to: "/conversation", label: "Parla amb el coach", desc: "Conversa en directe amb feedback", icon: MessageCircle, accent: "coral" },
    { to: "/roleplay", label: "Representa una escena", desc: "Entrevistes, crides, reunions", icon: Drama, accent: "mint" },
    { to: "/chunks", label: "Biblioteca d'expressions", desc: "Expressions ja fetes", icon: Library, accent: "gold" },
    { to: "/correct", label: "Corregeix la meva escriptura", desc: "Enganxa un correu o missatge", icon: PencilLine, accent: "coral" },
  ] : [
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
                  { x: 10,  y: 18, r: 6,  fill: BRAND.coral },
                  { x: 35,  y: 8,  r: 4,  fill: BRAND.mint },
                  { x: 60,  y: 28, r: 5,  fill: BRAND.gold },
                  { x: 90,  y: 12, r: 7,  fill: BRAND.coral },
                  { x: 120, y: 30, r: 4,  fill: BRAND.mint },
                  { x: 148, y: 10, r: 6,  fill: BRAND.gold },
                  { x: 175, y: 24, r: 5,  fill: BRAND.coral },
                  { x: 205, y: 8,  r: 4,  fill: BRAND.mint },
                  { x: 235, y: 32, r: 6,  fill: BRAND.gold },
                  { x: 255, y: 15, r: 3,  fill: BRAND.coral },
                ].map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.fill} opacity={0.85} />
                ))}
                {[
                  { x: 22, y: 36, w: 10, h: 5, fill: BRAND.gold, rx: 2 },
                  { x: 108, y: 38, w: 8,  h: 4, fill: BRAND.mint, rx: 2 },
                  { x: 190, y: 40, w: 12, h: 5, fill: BRAND.coral, rx: 2 },
                ].map((r, i) => (
                  <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} rx={r.rx} opacity={0.8} />
                ))}
              </svg>

              {/* Maica celebrating + streak number */}
              <div className="bbl-float mb-1">
                <Maica mood="celebrating" size="md" className="mx-auto" />
              </div>
              <p className="font-display text-7xl font-extrabold text-coral leading-none mb-1">{streak}</p>
              <p className="font-display text-lg font-bold mb-4">
                {learningLanguage === "ca"
                  ? (streak === 1 ? "dia" : "dies")
                  : (streak === 1 ? "day" : "days")}
                {" "}streak 🎉
              </p>

              {/* Message */}
              <p className="text-sm text-paper-muted leading-relaxed mb-4">{celebMsg}</p>

              {/* Freezes */}
              {freezesLeft > 0 && (
                <p className="text-xs text-paper-faint mb-3">
                  ❄️ {freezesLeft} {learningLanguage === "ca"
                    ? (freezesLeft !== 1 ? "congelacions disponibles aquest mes" : "congelació disponible aquest mes")
                    : (freezesLeft !== 1 ? "freezes available this month" : "freeze available this month")}
                </p>
              )}

              <p className="text-xs text-paper-faint">
                {learningLanguage === "ca" ? "Toca en qualsevol lloc per continuar" : "Tap anywhere to continue"}
              </p>
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
          <h1 className="page-title">
            {greeting}, {firstName}.
          </h1>
          <p className="text-paper-muted mt-1">{maicaText}</p>
        </div>
        <Maica mood={maicaMood} size="md" className="shrink-0 mt-1" />
      </header>

      {profile && <HomeNudges userId={profile.id} language={learningLanguage} />}

      {/* Daily practice card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">
            {learningLanguage === "ca" ? "La teva pràctica d'avui" : "Today's practice"}
          </h2>
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
        ) : loadError || !lesson ? (
          <div className="text-center py-6">
            <p className="text-sm text-coral mb-1">
              {learningLanguage === "ca"
                ? "No hem pogut carregar la teva pràctica d'avui."
                : "We couldn't load today's practice."}
            </p>
            {loadError && <p className="text-xs text-paper-faint mb-3">{loadError}</p>}
            <button
              className="btn-coral px-4 py-2 text-sm"
              onClick={() => {
                setLoadingLesson(true);
                setReloadKey((k) => k + 1);
              }}
            >
              {learningLanguage === "ca" ? "Reintenta" : "Try again"}
            </button>
          </div>
        ) : lesson?.completed ? (
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="text-mint mx-auto mb-2 animate-check-pop" />
            <p className="font-display font-bold text-mint">
              {learningLanguage === "ca" ? "Finalitzat per avui!" : "All done for today!"}
            </p>
            <p className="text-xs text-paper-muted mt-1">
              {learningLanguage === "ca"
                ? "Torna demà per mantenir la teva racha."
                : "Come back tomorrow to keep your streak."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Chunk of the day */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
              onClick={() => toggleItem("chunk_done")}
            >
              {lesson.chunk_done ? (
                <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                  {learningLanguage === "ca" ? "Expressió del dia" : "Chunk of the day"}
                </p>
                {lesson?.chunk?.english ? (
                  <>
                    <p className="font-medium leading-snug">{lesson.chunk.english}</p>
                    {lesson.chunk.spanish && (
                      <p className="text-xs text-paper-faint mt-0.5 italic">{lesson.chunk.spanish}</p>
                    )}
                  </>
                ) : lesson?.chunk_id ? (
                  <p className="font-medium leading-snug text-paper-muted">
                    {learningLanguage === "ca" ? "Carregant expressió…" : "Loading chunk…"}
                  </p>
                ) : (
                  <p className="text-paper-muted text-sm">
                    {learningLanguage === "ca" ? "Cap expressió disponible." : "No chunk available."}
                  </p>
                )}
                <p className="text-xs text-paper-faint mt-1">
                  {learningLanguage === "ca"
                    ? "Practica dient-la en veu alta 3 vegades."
                    : "Practise saying it out loud 3 times."}
                </p>
              </div>
            </div>

            {/* Mini-conversation */}
            <div
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
              onClick={() => navigate("/conversation", { state: { topic: lesson?.topic } })}
            >
              {lesson.convo_done ? (
                <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                  {learningLanguage === "ca" ? "Mini-conversa" : "Mini-conversation"}
                </p>
                <p className="font-medium leading-snug">
                  {lesson?.topic ?? (learningLanguage === "ca" ? "Xat lliure" : "Free chat")}
                </p>
                <p className="text-xs text-paper-faint mt-1">
                  {lesson.convo_done
                    ? (learningLanguage === "ca"
                      ? "Fet — es va marcar al registrar-se la teva sessió ✓"
                      : "Done — ticked when your session was saved ✓")
                    : (learningLanguage === "ca"
                      ? `Toca per obrir el teu coach → (es marca al completar ${MIN_USER_TURNS} intercanvis)`
                      : `Tap to open your coach → (ticks after ${MIN_USER_TURNS} exchanges)`)}
                </p>
              </div>
            </div>

            {/* Word of the day — solo cuenta si hay palabra; si no, es un atajo */}
            {lesson.word ? (
              <div
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-ink-700 transition"
                onClick={() => toggleItem("word_done")}
              >
                {lesson.word_done ? (
                  <CheckCircle2 size={20} className="text-mint shrink-0 mt-0.5" />
                ) : (
                  <Circle size={20} className="text-paper-faint shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-paper-muted uppercase tracking-widest font-mono mb-0.5">
                    {learningLanguage === "ca" ? "Paraula del dia" : "Word of the day"}
                  </p>
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
                      aria-label={learningLanguage === "ca" ? "Pronuncia" : "Pronounce"}
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
                </div>
              </div>
            ) : (
              <Link
                to="/reading"
                className="flex items-center justify-between p-3 rounded-xl bg-mint/10 border border-mint/30 hover:border-mint/60 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={16} className="text-mint shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-mint">
                      {learningLanguage === "ca" ? "Aprèn una paraula nova" : "Learn a new word"}
                    </p>
                    <p className="text-xs text-paper-faint">
                      {learningLanguage === "ca"
                        ? "Toca qualsevol paraula al llegir per seguir-la — demà apareix aquí"
                        : "Tap any word while reading to track it — it shows up here tomorrow"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-mint/70 shrink-0 ml-2">
                  {learningLanguage === "ca" ? "Lectura →" : "Reading →"}
                </span>
              </Link>
            )}

            {reviewsDue > 0 && (
              <Link
                to="/review"
                className="flex items-center justify-between p-3 rounded-xl bg-gold/10 border border-gold/30 hover:border-gold/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-gold" />
                  <span className="text-sm font-medium text-gold">
                    {reviewsDue} {learningLanguage === "ca"
                      ? (reviewsDue !== 1 ? "revisions necessàries" : "revisió necessària")
                      : (reviewsDue !== 1 ? "reviews due" : "review due")}
                  </span>
                </div>
                <span className="text-xs text-gold/70">
                  {learningLanguage === "ca" ? "Practica ara →" : "Practice now →"}
                </span>
              </Link>
            )}

            {itemError && <p className="text-xs text-coral text-center">{itemError}</p>}

            <button
              className="btn-coral w-full mt-2 flex items-center justify-center gap-2"
              disabled={!allChecked || completing}
              onClick={handleComplete}
            >
              {completing ? (
                <span className="flex items-center gap-2"><BrandDots /> Guardando…</span>
              ) : (
                learningLanguage === "ca"
                  ? "Completa la pràctica d'avui ✓"
                  : "Complete today's practice ✓"
              )}
            </button>
            {!allChecked && (
              <p className="text-xs text-paper-faint text-center">
                {learningLanguage === "ca"
                  ? `${doneCount}/${items.length} — completa ${items.length === 1 ? "la tasca" : "les tasques"} de dalt`
                  : `${doneCount}/${items.length} — finish the ${items.length === 1 ? "task" : "tasks"} above`}
                {!lesson.word && (learningLanguage === "ca"
                  ? " (la paraula del dia no compta avui)"
                  : " (the word of the day doesn't count today)")}
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
            <span className="text-xs">
              {learningLanguage === "ca" ? "Racha" : "Streak"}
            </span>
          </div>
          <p className="font-display text-2xl font-bold">
            {streak} <span className="text-sm font-normal text-paper-muted">
              {learningLanguage === "ca" ? "dies" : "days"}
            </span>
          </p>
          {freezesLeft > 0 && (
            <p className="text-[10px] text-paper-faint mt-0.5">❄️ {freezesLeft}</p>
          )}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Target size={15} className="text-mint" />
            <span className="text-xs">
              {learningLanguage === "ca" ? "Nivell" : "Level"}
            </span>
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
            <span className="text-xs">
              {learningLanguage === "ca" ? "Expressions" : "Chunks"}
            </span>
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
            <p className="eyebrow mb-1 text-coral">
              {learningLanguage === "ca" ? "El coach ha notat" : "Coach noticed"}
            </p>
            <p className="font-medium">
              {learningLanguage === "ca" ? (
                <>Segueixes cometent errors en <strong>{errorLabel(stats.topError)}</strong>. Vols practicar-ho en un xat ràpid?</>
              ) : (
                <>You keep slipping on <strong>{errorLabel(stats.topError)}</strong>. Want to drill it in a quick chat?</>
              )}
            </p>
          </div>
          <span className="text-coral group-hover:translate-x-1 transition">→</span>
        </Link>
      )}

      {learningLanguage !== "ca" && <div className="mb-6"><XpCard compact /></div>}

      {/* Modules */}
      <div className="grid sm:grid-cols-2 gap-4 stagger">
        {modules.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="card-interactive p-6 group relative overflow-hidden"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-30 ${
                m.accent === "coral" ? "bg-coral" : m.accent === "mint" ? "bg-mint" : "bg-gold"
              }`}
            />
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
          <BarChart3 size={15} />
          {learningLanguage === "ca" ? "Veu el teu progrés complet" : "See your full progress"}
        </Link>
      </div>
    </div>
  );
}
