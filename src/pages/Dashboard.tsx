import { BRAND } from "../lib/theme";
import XpCard from "../components/XpCard";
import TodayCard from "../components/TodayCard";
import HomeNudges from "../components/HomeNudges";
import { awardXp, DAILY_LESSON_XP, dailyLessonRefKey } from "../lib/xp";
import { consolidateLevel } from "../lib/leveling";
import { localDateISO, addLocalDays, timestampToLocalDate } from "../lib/dates";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { buildPlan, loadPlanInput, type PlanTask } from "../lib/plan";
import {
  getTodayLesson,
  completeLesson,
  setLessonItem,
  getStreakInfo,
  type DailyLesson,
  type LessonItem,
} from "../lib/dailyLesson";
import { lookupWord, dictLang, type WordDefinition } from "../lib/dictionary";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { checkAchievements, markSeen, type AchievementDef } from "../lib/achievements";
import AchievementCelebration from "../components/AchievementCelebration";
import Maica, { type MaicaMood } from "../components/Maica";
import { tFor } from "../i18n";

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();

  // Re-leveling: una consolidación por día al entrar a Inicio (ver lib/leveling.ts).
  useEffect(() => {
    if (!profile?.diagnostic_complete || profile.level_updated_on === localDateISO()) return;
    consolidateLevel(profile)
      .then((r) => { if (r.changed) void refreshProfile(); })
      .catch((err) => console.warn("[leveling]", err));
  }, [profile?.id, profile?.diagnostic_complete, profile?.level_updated_on]);
  const voicePrefs = useVoicePrefs();
  const [sessionCount, setSessionCount] = useState(0);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [streak, setStreak] = useState(0);
  const [freezesLeft, setFreezesLeft] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebMsg, setCelebMsg] = useState("");
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [completing, setCompleting] = useState(false);

  const [activeLast2Days, setActiveLast2Days] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [itemError, setItemError] = useState("");
  const [savingItem, setSavingItem] = useState<LessonItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const learningLanguage = profile?.learning_language || "en";
  const isCa = learningLanguage === "ca";
  const t = tFor(learningLanguage);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoadError("");
      try {
        const [{ data: sessions }, todayLesson, streakInfo, planTasks] = await Promise.all([
          supabase.from("sessions").select("created_at, completed").eq("user_id", profile.id),
          getTodayLesson(profile.id, learningLanguage),
          // Vista de lectura: NUNCA consumir freezes al abrir el Home.
          getStreakInfo(profile.id, false),
          // Sin plan, la práctica del día se muestra igual.
          loadPlanInput(profile)
            .then((input) => buildPlan(input).tasks)
            .catch((err): PlanTask[] => {
              console.warn("[plan]", err);
              return [];
            }),
        ]);

        setSessionCount(sessions?.length ?? 0);
        setTasks(planTasks);
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

        // La conversación se deriva de que hoy haya una sesión registrada o de que
        // el plan vea una conversación o un roleplay (las llamadas en vivo solo
        // dejan XP). Si es así se persiste el tilde (sin toggle optimista).
        let lessonToShow = todayLesson;
        const todayConvoDone =
          rows.some((s) => s.completed && timestampToLocalDate(s.created_at) === todayStr) ||
          planTasks.some((x) => x.id === "talk" && x.done);
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

        if (lessonToShow.word) {
          lookupWord(lessonToShow.word, dictLang(profile.learning_language)).then(setWordDef).catch(() => null);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("home.errLoad"));
      } finally {
        // Pase lo que pase, el Home sale del estado "cargando".
        setLoadingLesson(false);
      }
    })();
  }, [profile, reloadKey]);

  const congrats = t("home.congrats", { returnObjects: true }) as unknown as string[];

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

      setCelebMsg(congrats[Math.floor(Math.random() * congrats.length)]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4500);

      checkAchievements(profile.id).then((newly) => {
        if (newly.length > 0) setNewAchievements(newly);
      });
    } catch (e) {
      setItemError(e instanceof Error ? e.message : t("home.errSave"));
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
      setItemError(e instanceof Error ? e.message : t("home.errSaveChange"));
    } finally {
      setSavingItem(null);
    }
  }

  const firstName = profile?.name?.split(" ")[0] ?? t("home.nameFallback");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home.greetingMorning") : hour < 19 ? t("home.greetingAfternoon") : t("home.greetingEvening");

  const maicaMood: MaicaMood = lesson?.completed
    ? "celebrating"
    : !activeLast2Days && streak === 0 && sessionCount > 0
    ? "sleeping"
    : "happy";

  const maicaText = lesson?.completed
    ? t("home.maicaProud")
    : !activeLast2Days && streak === 0 && sessionCount > 0
    ? t("home.maicaMissed")
    : t("home.maicaWaiting");

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
                {t("home.streakLabel", { word: streak === 1 ? t("home.streakDay") : t("home.streakDays") })}
              </p>

              {/* Message */}
              <p className="text-sm text-paper-muted leading-relaxed mb-4">{celebMsg}</p>

              {/* Freezes */}
              {freezesLeft > 0 && (
                <p className="text-xs text-paper-faint mb-3">
                  ❄️ {freezesLeft} {freezesLeft !== 1 ? t("home.freezeMany") : t("home.freezeOne")}
                </p>
              )}

              <p className="text-xs text-paper-faint">{t("home.tapContinue")}</p>
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
          <p className="eyebrow mb-2">{new Date().toLocaleDateString(isCa ? "ca-ES" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="page-title">{t("home.title", { greeting, name: firstName })}</h1>
          <p className="text-paper-muted mt-1">{maicaText}</p>
        </div>
        <Maica mood={maicaMood} size="md" className="shrink-0 mt-1" />
      </header>

      {profile && <HomeNudges userId={profile.id} language={learningLanguage} />}

      <TodayCard
        lang={learningLanguage}
        lesson={lesson}
        tasks={tasks}
        loading={loadingLesson}
        error={loadError}
        itemError={itemError}
        completing={completing}
        streak={streak}
        freezesLeft={freezesLeft}
        wordDef={wordDef}
        onRetry={() => {
          setLoadingLesson(true);
          setReloadKey((k) => k + 1);
        }}
        onToggle={toggleItem}
        onComplete={handleComplete}
        onSpeak={(word) =>
          speak(word, {
            voiceName: voicePrefs.voiceName ?? undefined,
            rate: voicePrefs.voiceRate,
            lang: voicePrefs.voiceAccent,
          })
        }
      />

      <div className="mb-6"><XpCard compact /></div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link to="/progress" className="inline-flex items-center gap-2 text-paper-muted hover:text-paper">
          <BarChart3 size={15} aria-hidden />
          {profile?.current_level ? t("home.levelLink", { level: profile.current_level }) : t("home.seeProgress")}
        </Link>
        <Link to="/mistakes" className="text-paper-muted hover:text-paper">
          {t("home.mistakesLink")}
        </Link>
      </div>
    </div>
  );
}
