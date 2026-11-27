import Confetti, { haptic } from "../components/Confetti";
import { useCountUp } from "../lib/useCountUp";
import XpCard from "../components/XpCard";
import TodayCard from "../components/TodayCard";
import HomeNudges from "../components/HomeNudges";
import { awardXp, DAILY_LESSON_XP, dailyLessonRefKey } from "../lib/xp";
import { consolidateLevel } from "../lib/leveling";
import { localDateISO, addLocalDays, timestampToLocalDate } from "../lib/dates";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Flame } from "lucide-react";
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
      haptic([20, 70, 30]);
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
    <div>
      {/* ── Celebration overlay ── */}
      {showCelebration && (
        <div
          className="overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 backdrop-blur-md"
          onClick={() => setShowCelebration(false)}
          role="dialog"
          aria-label={t("home.streakLabel", { word: streak === 1 ? t("home.streakDay") : t("home.streakDays") })}
        >
          <div className="card relative mx-4 w-full max-w-xs animate-pop-in p-8 text-center">
            <Confetti pieces={34} spread={190} />
            <div className="mb-1">
              <Maica mood="celebrating" size="md" className="mx-auto" />
            </div>
            <p className="mb-1 flex items-center justify-center gap-2 font-display text-7xl font-extrabold leading-none text-coral tabular-nums">
              <Flame size={44} className="flame-live text-gold" aria-hidden />
              <StreakCount value={streak} />
            </p>
            <p className="mb-4 font-display text-lg font-bold">
              {t("home.streakLabel", { word: streak === 1 ? t("home.streakDay") : t("home.streakDays") })}
            </p>
            <p className="mb-4 text-sm leading-relaxed text-paper-muted">{celebMsg}</p>
            {freezesLeft > 0 && (
              <p className="mb-3 text-xs text-paper-faint">
                ❄️ {freezesLeft} {freezesLeft !== 1 ? t("home.freezeMany") : t("home.freezeOne")}
              </p>
            )}
            <p className="text-xs text-paper-faint">{t("home.tapContinue")}</p>
          </div>
        </div>
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
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">{new Date().toLocaleDateString(isCa ? "ca-ES" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="page-title">{t("home.title", { greeting, name: firstName })}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`stat-chip ${streak > 0 ? "text-coral" : "text-paper-muted"}`} title={t("home.streakAtRisk")}>
              <Flame size={16} className={streak > 0 ? "flame-live text-gold" : ""} aria-hidden />
              {streak} {streak === 1 ? t("home.streakDay") : t("home.streakDays")}
            </span>
            {freezesLeft > 0 && (
              <span className="stat-chip text-sky">
                ❄️ {freezesLeft}
                <span className="sr-only"> {freezesLeft !== 1 ? t("home.freezeWordMany") : t("home.freezeWordOne")}</span>
              </span>
            )}
            <span className="text-sm text-paper-muted">{maicaText}</span>
          </div>
        </div>
        <Maica mood={maicaMood} size="md" className="mt-1 shrink-0" />
      </header>

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
        between={profile ? <HomeNudges userId={profile.id} language={learningLanguage} /> : null}
      />

      <section aria-labelledby="level-title" className="mb-6">
        <h2 id="level-title" className="mb-3 font-display text-xl font-extrabold tracking-tight">
          {t("home.levelTitle")}
        </h2>
        <XpCard compact />
      </section>

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

/** La racha sube contando desde la anterior. */
function StreakCount({ value }: { value: number }) {
  return <>{useCountUp(value, 1100)}</>;
}
