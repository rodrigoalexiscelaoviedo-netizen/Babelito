/**
 * Plan de estudio: "tu semana" y las tareas recomendadas de hoy.
 *
 * Todo se deduce de lo que la persona ya hizo (xp_events, progreso de
 * situaciones, repaso pendiente y errores), sin tablas nuevas. Las funciones
 * de armado son puras y están testeadas.
 */
import { supabase } from "./supabaseClient";
import { addLocalDays, localDateISO, timestampToLocalDate } from "./dates";
import { countDue } from "./srs";
import { errorLabel } from "./errorTypes";
import { lessonsForError } from "./grammarLessons";
import { lessonsForErrorCa } from "./grammarLessonsCa";
import { SITUATIONS_CA } from "./situationsDataCa";
import { loadErrorRows, summarizeErrors } from "./mistakes";
import {
  SITUATIONS,
  nextStep,
  sortSituations,
  stepsCount,
  loadProgress,
  type SituationProgress,
  type StepKey,
} from "./situations";

export interface PlanEvent {
  source: string;
  created_at: string;
}

type Lang = "en" | "ca";

export interface PlanInput {
  /** Idioma que se aprende. Por defecto inglés. */
  lang?: Lang;
  /** Hoy, YYYY-MM-DD en hora local. */
  today: string;
  /** Eventos de XP de los últimos 7 días. */
  events: PlanEvent[];
  dueReviews: number;
  mission: { packId: string; title: string; started: boolean; next: StepKey | null } | null;
  topError: { type: string; label: string; lessonId: string | null } | null;
  /** Misiones con avance esta semana. */
  missionsThisWeek: number;
  missionTodayDone: boolean;
  grammarTodayDone: boolean;
}

export interface PlanTask {
  id: string;
  title: string;
  detail: string;
  to: string;
  minutes: number;
  done: boolean;
}

export interface WeeklyGoal {
  id: string;
  label: string;
  current: number;
  target: number;
}

export interface DayCell {
  date: string;
  label: string;
  active: boolean;
  isToday: boolean;
}

export interface Plan {
  tasks: PlanTask[];
  goals: WeeklyGoal[];
  days: DayCell[];
  doneToday: number;
}

/** Textos del plan. Inglés por defecto; catalán para quien aprende catalán. */
const COPY = {
  en: {
    steps: { phrases: "learn the key phrases", dialogue: "study the dialogue", quiz: "take the quiz", roleplay: "do the live roleplay" } as Record<StepKey, string>,
    days: "Days practised",
    speaking: "Conversations & roleplays",
    review: "Items reviewed",
    missions: "Situation missions worked on",
    reviewTitle: (n: number) => `Review ${n} item${n === 1 ? "" : "s"}`,
    reviewDone: "Review done",
    reviewDetail: "Words and phrases due today, at the right moment to remember them.",
    talkTitle: "Have a conversation",
    talkDetail: "Five minutes speaking with your coach. Try the Call button for a hands-free chat.",
    missionContinue: (t: string) => `Continue: ${t}`,
    missionStart: (t: string) => `Start a situation: ${t}`,
    nextStep: (s: string) => `Next step: ${s}.`,
    missionDone: "Mission complete — repeat any step to keep it fresh.",
    habit: (l: string) => `Fix a habit: ${l}`,
    lessonRead: "Read the short lesson and pass the quiz.",
    practiseEx: "Practise with exercises made for you.",
    earTitle: "Train your ear",
    earDetail: "A quick dictation round: listen and write what you hear.",
  },
  ca: {
    steps: { phrases: "aprèn les frases clau", dialogue: "estudia el diàleg", quiz: "fes el qüestionari", roleplay: "fes el rol en directe" } as Record<StepKey, string>,
    days: "Dies practicats",
    speaking: "Converses i rols",
    review: "Elements repassats",
    missions: "Missions de situacions treballades",
    reviewTitle: (n: number) => `Repassa ${n} element${n === 1 ? "" : "s"}`,
    reviewDone: "Repàs fet",
    reviewDetail: "Paraules i frases pendents avui, en el moment just per recordar-les.",
    talkTitle: "Mantén una conversa",
    talkDetail: "Cinc minuts parlant amb el teu coach. Prova el botó de trucada per a una conversa sense mans.",
    missionContinue: (t: string) => `Continua: ${t}`,
    missionStart: (t: string) => `Comença una situació: ${t}`,
    nextStep: (s: string) => `Següent pas: ${s}.`,
    missionDone: "Missió completada — repeteix qualsevol pas per mantenir-la fresca.",
    habit: (l: string) => `Corregeix un hàbit: ${l}`,
    lessonRead: "Llegeix la lliçó curta i supera el qüestionari.",
    practiseEx: "Practica amb exercicis fets per a tu.",
    earTitle: "Entrena l'oïda",
    earDetail: "Una ronda ràpida de dictat: escolta i escriu el que sentis.",
  },
};

/** Fecha local YYYY-MM-DD → abreviatura del día (Mon, Tue… / dl., dt.…). */
export function weekdayLabel(date: string, lang: Lang = "en"): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "ca" ? "ca-ES" : "en", { weekday: "short" });
}

export function buildPlan(input: PlanInput): Plan {
  const { today, events } = input;
  const lang: Lang = input.lang ?? "en";
  const C = COPY[lang];

  const byDay = new Map<string, PlanEvent[]>();
  for (const e of events) {
    const day = timestampToLocalDate(e.created_at);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const todayEvents = byDay.get(today) ?? [];
  const has = (...sources: string[]) => todayEvents.some((e) => sources.includes(e.source));

  // Últimos 7 días terminando hoy.
  const days: DayCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDaysTo(today, -i);
    days.push({ date: d, label: weekdayLabel(d, lang), active: (byDay.get(d)?.length ?? 0) > 0, isToday: d === today });
  }

  const count = (...sources: string[]) => events.filter((e) => sources.includes(e.source)).length;

  const goals: WeeklyGoal[] = [
    { id: "days", label: C.days, current: days.filter((d) => d.active).length, target: 5 },
    { id: "speaking", label: C.speaking, current: count("conversation", "roleplay"), target: 3 },
    { id: "review", label: C.review, current: count("review"), target: 20 },
    { id: "missions", label: C.missions, current: input.missionsThisWeek, target: 1 },
  ];

  const tasks: PlanTask[] = [];

  if (input.dueReviews > 0 || has("review")) {
    tasks.push({
      id: "review",
      title: input.dueReviews > 0 ? C.reviewTitle(input.dueReviews) : C.reviewDone,
      detail: C.reviewDetail,
      to: "/review",
      minutes: Math.min(10, Math.max(2, Math.ceil(input.dueReviews / 4))),
      done: input.dueReviews === 0,
    });
  }

  tasks.push({
    id: "talk",
    title: C.talkTitle,
    detail: C.talkDetail,
    to: "/conversation",
    minutes: 5,
    done: has("conversation", "roleplay"),
  });

  if (input.mission) {
    const m = input.mission;
    tasks.push({
      id: "mission",
      title: m.started ? C.missionContinue(m.title) : C.missionStart(m.title),
      detail: m.next ? C.nextStep(C.steps[m.next]) : C.missionDone,
      to: `/situations/${m.packId}`,
      minutes: 8,
      done: input.missionTodayDone,
    });
  }

  if (input.topError) {
    tasks.push({
      id: "error",
      title: C.habit(input.topError.label),
      detail: input.topError.lessonId ? C.lessonRead : C.practiseEx,
      to: input.topError.lessonId ? `/grammar/${input.topError.lessonId}` : "/mistakes",
      minutes: 5,
      done: input.grammarTodayDone,
    });
  }

  tasks.push({
    id: "listen",
    title: C.earTitle,
    detail: C.earDetail,
    to: "/dictation",
    minutes: 4,
    done: has("listening"),
  });

  return { tasks, goals, days, doneToday: tasks.filter((t) => t.done).length };
}

/** Suma días a una fecha local YYYY-MM-DD sin pasar por UTC. */
function addDaysTo(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return localDateISO(new Date(y, m - 1, d + delta));
}

// ── Carga de datos ──────────────────────────────────────────────────────────────

export async function loadPlanInput(profile: { id: string; current_level: string | null; learning_language?: string | null }): Promise<PlanInput> {
  const today = localDateISO();
  const since = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const lang: Lang = profile.learning_language === "ca" ? "ca" : "en";
  const bank = lang === "ca" ? SITUATIONS_CA : SITUATIONS;

  const [{ data: ev }, due, progress, errorRows] = await Promise.all([
    supabase.from("xp_events").select("source, created_at").eq("user_id", profile.id).gte("created_at", since),
    countDue(profile.id, profile.learning_language || "en"),
    loadProgress(profile.id),
    loadErrorRows(profile.id),
  ]);

  const rows = Object.values(progress) as SituationProgress[];
  const updatedToday = (r: SituationProgress) => timestampToLocalDate(r.updated_at) === today;
  const updatedWeek = (r: SituationProgress) => r.updated_at >= addLocalDays(-6);

  const situationRows = rows.filter((r) => !r.pack_id.startsWith("grammar:"));
  const grammarRows = rows.filter((r) => r.pack_id.startsWith("grammar:"));

  // Misión: la que está a medias (más reciente) o una sugerida a tu nivel.
  const started = bank.filter((s) => {
    const n = stepsCount(progress[s.id]?.steps);
    return n > 0 && n < 4;
  }).sort((a, b) => (progress[b.id]?.updated_at ?? "").localeCompare(progress[a.id]?.updated_at ?? ""));
  const pack = started[0] ?? sortSituations(bank, profile.current_level, progress)[0];

  const top = summarizeErrors(errorRows).stats[0];

  return {
    lang,
    today,
    events: (ev ?? []) as PlanEvent[],
    dueReviews: due,
    mission: pack
      ? { packId: pack.id, title: pack.title, started: stepsCount(progress[pack.id]?.steps) > 0, next: nextStep(progress[pack.id]?.steps) }
      : null,
    topError: top
      ? {
          type: top.type,
          label: errorLabel(top.type, lang),
          lessonId: (lang === "ca" ? lessonsForErrorCa : lessonsForError)(top.type)[0]?.id ?? null,
        }
      : null,
    missionsThisWeek: situationRows.filter(updatedWeek).length,
    missionTodayDone: situationRows.some(updatedToday),
    grammarTodayDone: grammarRows.some(updatedToday),
  };
}
