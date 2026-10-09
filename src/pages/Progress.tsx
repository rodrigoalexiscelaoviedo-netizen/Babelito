import { addLocalDays } from "../lib/dates";
import { useEffect, useRef, useState } from "react";
import { ActivityArea, HorizontalBars } from "../components/Charts";
import {
  Flame,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  BookOpen,
  Layers,
  Mic,
  BookMarked,
  Trophy,
  Lock,

  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel, errorHint } from "../lib/errorTypes";
import { getStreak, getFreezeCount } from "../lib/dailyLesson";
import { getReports, type SessionReport } from "../lib/sessionReport";
import { deckSize } from "../lib/srs";
import { scopeByLanguage } from "../lib/language";
import { getAchievements, type AchievementWithStatus } from "../lib/achievements";
import Loader from "../components/Loader";
import Maica from "../components/Maica";

interface ErrRow { error_type: string }
interface SessRow { created_at: string; duration_seconds: number }
interface VocabRow { status: string; created_at: string }
interface StoryProgRow { completed: boolean }
interface DailyRow { lesson_date: string; completed: boolean }

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNum({ target, duration = 900 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(p * target));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return <>{display}</>;
}

// ── SVG ring ─────────────────────────────────────────────────────────────────
function Ring({
  value,
  max,
  color,
  size = 88,
  stroke = 9,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - pct)), 80);
    return () => clearTimeout(t);
  }, [pct, circ]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2C3852" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.9s ease-out" }}
      />
    </svg>
  );
}

// ── Ring stat card ────────────────────────────────────────────────────────────
function RingStat({
  label,
  value,
  max,
  unit,
  sub,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-4 flex flex-col items-center gap-1.5">
      <div className="relative">
        <Ring value={value} max={max} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-extrabold leading-none">
            <AnimatedNum target={value} />
          </span>
          {unit && <span className="text-[9px] text-paper-faint mt-0.5">{unit}</span>}
        </div>
      </div>
      <p className="text-xs text-paper-muted font-medium">{label}</p>
      {sub && <p className="text-[10px] text-paper-faint">{sub}</p>}
    </div>
  );
}

// ── Achievement icon map ──────────────────────────────────────────────────────
const ACH_ICONS: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle size={22} />,
  BookOpen: <BookOpen size={22} />,
  Layers: <Layers size={22} />,
  Mic: <Mic size={22} />,
  BookMarked: <BookMarked size={22} />,
  Flame: <Flame size={22} />,
  Trophy: <Trophy size={22} />,
};

const COLOR_TOKEN: Record<string, string> = {
  coral: "text-coral",
  mint: "text-mint",
  gold: "text-gold",
};

// ── Weekly summary bar ────────────────────────────────────────────────────────
function WeekBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? Math.min((value / max) * 100, 100) : 0), 100);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-paper-muted w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-ink-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="text-xs font-display font-bold w-8 text-right">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Progress() {
  const { profile } = useAuth();
  const learningLanguage = profile?.learning_language || "en";
  const [loading, setLoading] = useState(true);
  const [errs, setErrs] = useState<ErrRow[]>([]);
  const [sessions, setSessions] = useState<SessRow[]>([]);
  const [vocab, setVocab] = useState<VocabRow[]>([]);
  const [storyProg, setStoryProg] = useState<StoryProgRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [deck, setDeck] = useState(0);
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const learningLanguage = profile.learning_language || "en";
      const [{ data: e }, { data: s }, { data: v }, { data: sp }, { data: dl }, streakCount, latestReports, deckCount, freezeCount, achList] =
        await Promise.all([
          supabase.from("errors").select("error_type").eq("user_id", profile.id),
          supabase.from("sessions").select("created_at, duration_seconds").eq("user_id", profile.id),
          scopeByLanguage(supabase.from("user_vocabulary").select("status, created_at").eq("user_id", profile.id), learningLanguage),
          supabase.from("story_progress").select("completed").eq("user_id", profile.id).eq("completed", true),
          scopeByLanguage(
            supabase.from("daily_lessons").select("lesson_date, completed").eq("user_id", profile.id).gte("lesson_date", addLocalDays(-7)),
            learningLanguage
          ),
          getStreak(profile.id),
          getReports(profile.id, learningLanguage, 5),
          deckSize(profile.id, learningLanguage),
          getFreezeCount(profile.id),
          getAchievements(profile.id),
        ]);

      setErrs((e as ErrRow[]) ?? []);
      setSessions((s as SessRow[]) ?? []);
      setVocab((v as VocabRow[]) ?? []);
      setStoryProg((sp as StoryProgRow[]) ?? []);
      setDailyRows((dl as DailyRow[]) ?? []);
      setStreak(streakCount);
      setFreezes(freezeCount);
      setReports(latestReports);
      setDeck(deckCount);
      setAchievements(achList);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <Loader />;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const tally: Record<string, number> = {};
  errs.forEach((e) => (tally[e.error_type] = (tally[e.error_type] ?? 0) + 1));
  const topErrors = Object.entries(tally)
    .map(([k, v]) => ({ type: k, label: errorLabel(k), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const days: { day: string; sessions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      day: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2),
      sessions: sessions.filter((s) => new Date(s.created_at).toDateString() === key).length,
    });
  }

  const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0) / 60);
  const vocabTotal = vocab.length;
  const vocabKnown = vocab.filter((v) => v.status === "known").length;

  // ── Weekly summary ─────────────────────────────────────────────────────────
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekSessions = sessions.filter((s) => new Date(s.created_at) >= weekAgoDate).length;
  const weekMinutes = Math.round(
    sessions
      .filter((s) => new Date(s.created_at) >= weekAgoDate)
      .reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0) / 60
  );
  const weekWords = vocab.filter((v) => new Date(v.created_at) >= weekAgoDate).length;
  const weekActiveDays = dailyRows.filter((d) => d.completed).length;

  // ── Streak ring milestone ──────────────────────────────────────────────────
  const streakMilestone = streak < 7 ? 7 : streak < 30 ? 30 : 100;
  const streakSub =
    streak >= 100
      ? "🏆 Centurion"
      : streak >= 30
      ? `${streakMilestone - streak} to next`
      : `${streakMilestone - streak} to ${streakMilestone}d`;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{learningLanguage === "ca" ? "El teu progrés" : "Your progress"}</p>
      <h1 className="font-display text-3xl font-extrabold mb-6">{learningLanguage === "ca" ? "Com estàs" : "How you're doing"}</h1>

      {/* ── Ring stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        <RingStat
          label={learningLanguage === "ca" ? "Racha" : "Streak"}
          value={streak}
          max={streakMilestone}
          unit={learningLanguage === "ca" ? "dies" : "days"}
          sub={freezes > 0 ? `❄️ ${freezes}` : streakSub}
          color="#FF6B5E"
        />
        <RingStat
          label={learningLanguage === "ca" ? "Sessions" : "Sessions"}
          value={sessions.length}
          max={Math.max(50, sessions.length)}
          unit={learningLanguage === "ca" ? "total" : "total"}
          color="#36C5A8"
        />
        <RingStat
          label={learningLanguage === "ca" ? "Minuts" : "Minutes"}
          value={totalMinutes}
          max={Math.max(120, totalMinutes)}
          unit={learningLanguage === "ca" ? "min" : "min"}
          color="#F7C948"
        />
        <RingStat
          label={learningLanguage === "ca" ? "Baralla de revisió" : "Review deck"}
          value={deck}
          max={50}
          unit={learningLanguage === "ca" ? "cartes" : "cards"}
          sub={deck >= 50 ? (learningLanguage === "ca" ? "Objectiu aconseguit!" : "Goal reached!") : `${50 - deck} ${learningLanguage === "ca" ? "a 50" : "to 50"}`}
          color="#FF6B5E"
        />
        <RingStat
          label={learningLanguage === "ca" ? "Vocabulari" : "Vocabulary"}
          value={vocabTotal}
          max={Math.max(100, vocabTotal)}
          unit={learningLanguage === "ca" ? "paraules" : "words"}
          sub={`${vocabKnown} ${learningLanguage === "ca" ? "sabudes" : "known"}`}
          color="#36C5A8"
        />
        <RingStat
          label={learningLanguage === "ca" ? "Històries" : "Stories"}
          value={storyProg.length}
          max={Math.max(10, storyProg.length)}
          unit={learningLanguage === "ca" ? "fetes" : "done"}
          color="#F7C948"
        />
      </div>

      {/* ── Weekly summary ─────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-1">{learningLanguage === "ca" ? "La teva setmana" : "Tu semana"}</h3>
        <p className="text-sm text-paper-muted mb-4">{learningLanguage === "ca" ? "Últims 7 dies d'un cop d'ull." : "Last 7 days at a glance."}</p>
        <div className="space-y-3">
          <WeekBar label={learningLanguage === "ca" ? "Dies actius" : "Active days"} value={weekActiveDays} max={7} color="#FF6B5E" />
          <WeekBar label={learningLanguage === "ca" ? "Sessions" : "Sessions"} value={weekSessions} max={7} color="#36C5A8" />
          <WeekBar label={learningLanguage === "ca" ? "Minuts" : "Minutes"} value={weekMinutes} max={60} color="#F7C948" />
          <WeekBar label={learningLanguage === "ca" ? "Paraules noves" : "New words"} value={weekWords} max={20} color="#36C5A8" />
        </div>
        {weekActiveDays === 7 && (
          <p className="text-xs text-mint mt-3 text-center font-medium">{learningLanguage === "ca" ? "🔥 Setmana perfecta — 7/7 dies actius!" : "🔥 Perfect week — 7/7 active days!"}</p>
        )}
      </div>

      {/* ── Achievements gallery ────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-1">{learningLanguage === "ca" ? "Assoliments" : "Achievements"}</h3>
        <p className="text-sm text-paper-muted mb-4">
          {achievements.filter((a) => a.unlocked).length} / {achievements.length} {learningLanguage === "ca" ? "desbloqueats" : "unlocked"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={`rounded-xl p-3 flex flex-col items-center gap-1.5 text-center transition ${
                a.unlocked
                  ? "bg-ink-700 border border-ink-500"
                  : "bg-ink-800 border border-ink-700 opacity-60"
              }`}
            >
              <span className={a.unlocked ? COLOR_TOKEN[a.color] : "text-paper-faint"}>
                {a.unlocked ? (ACH_ICONS[a.icon] ?? <Trophy size={22} />) : <Lock size={20} />}
              </span>
              <p className={`text-xs font-display font-bold leading-tight ${a.unlocked ? "text-paper" : "text-paper-faint"}`}>
                {a.title}
              </p>
              {a.unlocked && a.unlocked_at ? (
                <p className="text-[10px] text-paper-faint">
                  {new Date(a.unlocked_at).toLocaleDateString("en", { day: "numeric", month: "short" })}
                </p>
              ) : (
                <p className="text-[10px] text-paper-faint leading-tight">{a.hint}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Vocabulary card ─────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-1">{learningLanguage === "ca" ? "Vocabulari" : "Vocabulary"}</h3>
        <p className="text-sm text-paper-muted mb-4">{learningLanguage === "ca" ? "Paraules que has registrat mentre llegia." : "Words you've tracked while reading."}</p>
        {vocabTotal === 0 ? (
          <div className="empty-state">
            <Maica mood="curious" size="md" className="mb-1" />
            <p className="empty-state-title">
              {learningLanguage === "ca" ? "Sense paraules aún" : "No words yet"}
            </p>
            <p className="empty-state-sub">
              {learningLanguage === "ca"
                ? "Explora el mòdul de lectura i fes clic en les paraules que no coneixes per guardar-les."
                : "Explore the reading module and click the words you don't know to save them."}
            </p>
            <Link to="/reading" className="btn-mint mt-1 text-sm px-4 py-2">
              {learningLanguage === "ca" ? "Anar a Lectura" : "Go to Reading"} <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold">{vocabTotal}</p>
              <p className="text-xs text-paper-muted mt-0.5">{learningLanguage === "ca" ? "paraules totals" : "total words"}</p>
            </div>
            <div className="flex-1 h-3 bg-ink-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-mint rounded-full transition-all"
                style={{ width: vocabTotal > 0 ? `${Math.round((vocabKnown / vocabTotal) * 100)}%` : "0%" }}
              />
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-mint">{vocabKnown}</p>
              <p className="text-xs text-paper-muted mt-0.5">{learningLanguage === "ca" ? "sabudes" : "known"}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Activity chart ──────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-4">{learningLanguage === "ca" ? "Últims 14 dies" : "Last 14 days"}</h3>
        <ActivityArea data={days} height={160} />
      </div>

      {/* ── Session reports ─────────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-1">{learningLanguage === "ca" ? "Informes de sessió recents" : "Recent session reports"}</h3>
        <p className="text-sm text-paper-muted mb-4">{learningLanguage === "ca" ? "Generat per IA després de cada conversa o representació de rol." : "AI-generated after each conversation or roleplay."}</p>
        {reports.length === 0 ? (
          <div className="empty-state">
            <Maica mood="curious" size="md" className="mb-1" />
            <p className="empty-state-title">
              {learningLanguage === "ca" ? "Sense informes ainda" : "No reports yet"}
            </p>
            <p className="empty-state-sub">
              {learningLanguage === "ca"
                ? "Termina una conversa o representació de rol i el teu coach generarà un informe detallat."
                : "Complete a conversation or roleplay and your coach will generate a detailed report."}
            </p>
            <Link to="/conversation" className="btn-coral mt-1 text-sm px-4 py-2">
              {learningLanguage === "ca" ? "Parlar amb el coach" : "Talk to the coach"} <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => {
              const isOpen = expandedReport === r.id;
              const date = new Date(r.created_at).toLocaleDateString("en", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={r.id} className="border border-ink-600 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedReport(isOpen ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-ink-700 transition"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium capitalize">{r.kind} session</p>
                      <p className="text-xs text-paper-muted">{date}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-paper-faint" /> : <ChevronDown size={16} className="text-paper-faint" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-ink-600">
                      <p className="text-sm text-paper-muted leading-relaxed">{r.summary}</p>
                      {r.did_well.length > 0 && (
                        <div>
                          <p className="text-xs text-mint uppercase tracking-widest font-mono mb-1">{learningLanguage === "ca" ? "Va anar bé" : "Did well"}</p>
                          <ul className="space-y-0.5">
                            {r.did_well.map((item, i) => (
                              <li key={i} className="text-sm flex gap-2">
                                <span className="text-mint">✓</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.key_errors.length > 0 && (
                        <div>
                          <p className="text-xs text-coral uppercase tracking-widest font-mono mb-1">{learningLanguage === "ca" ? "Errors claus" : "Key errors"}</p>
                          <div className="space-y-1.5">
                            {r.key_errors.map((e, i) => (
                              <div key={i} className="text-sm">
                                <span className="text-coral line-through">{e.error}</span>
                                <span className="text-mint"> → {e.correction}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.suggested_chunks.length > 0 && (
                        <div>
                          <p className="text-xs text-gold uppercase tracking-widest font-mono mb-1">{learningLanguage === "ca" ? "Fragments suggerits" : "Suggested chunks"}</p>
                          <ul className="space-y-0.5">
                            {r.suggested_chunks.map((chunk, i) => (
                              <li key={i} className="font-mono text-xs text-paper-muted">"{chunk}"</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top errors ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-display font-bold mb-1">{learningLanguage === "ca" ? "En què treballar" : "What to work on"}</h3>
        <p className="text-sm text-paper-muted mb-4">{learningLanguage === "ca" ? "Els teus errors més freqüents — alimenten al teu coach." : "Your most frequent mistakes — these feed your coach."}</p>
        {topErrors.length === 0 ? (
          <div className="empty-state">
            <Maica mood="curious" size="md" className="mb-1" />
            <p className="empty-state-title">¡Todo limpio por ahora!</p>
            <p className="empty-state-sub">
              Tus errores aparecen aquí después de practicar con el coach. Empieza una conversación.
            </p>
            <Link to="/conversation" className="btn-ghost mt-1 text-sm px-4 py-2">
              Conversar con el coach <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <HorizontalBars data={topErrors} />
            <div className="mt-4 space-y-2">
              {topErrors.slice(0, 3).map((e) => (
                <p key={e.type} className="text-sm text-paper-muted">
                  <strong className="text-paper">{e.label}:</strong> {errorHint(e.type)}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
