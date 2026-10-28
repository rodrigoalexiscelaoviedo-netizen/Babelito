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

export interface PlanInput {
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

const STEP_LABEL: Record<StepKey, string> = {
  phrases: "learn the key phrases",
  dialogue: "study the dialogue",
  quiz: "take the quiz",
  roleplay: "do the live roleplay",
};

/** Fecha local YYYY-MM-DD → abreviatura del día (Mon, Tue…). */
export function weekdayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en", { weekday: "short" });
}

export function buildPlan(input: PlanInput): Plan {
  const { today, events } = input;

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
    days.push({ date: d, label: weekdayLabel(d), active: (byDay.get(d)?.length ?? 0) > 0, isToday: d === today });
  }

  const count = (...sources: string[]) => events.filter((e) => sources.includes(e.source)).length;

  const goals: WeeklyGoal[] = [
    { id: "days", label: "Days practised", current: days.filter((d) => d.active).length, target: 5 },
    { id: "speaking", label: "Conversations & roleplays", current: count("conversation", "roleplay"), target: 3 },
    { id: "review", label: "Items reviewed", current: count("review"), target: 20 },
    { id: "missions", label: "Situation missions worked on", current: input.missionsThisWeek, target: 1 },
  ];

  const tasks: PlanTask[] = [];

  if (input.dueReviews > 0 || has("review")) {
    tasks.push({
      id: "review",
      title: input.dueReviews > 0 ? `Review ${input.dueReviews} item${input.dueReviews === 1 ? "" : "s"}` : "Review done",
      detail: "Words and phrases due today, at the right moment to remember them.",
      to: "/review",
      minutes: Math.min(10, Math.max(2, Math.ceil(input.dueReviews / 4))),
      done: input.dueReviews === 0,
    });
  }

  tasks.push({
    id: "talk",
    title: "Have a conversation",
    detail: "Five minutes speaking with your coach. Try the Call button for a hands-free chat.",
    to: "/conversation",
    minutes: 5,
    done: has("conversation", "roleplay"),
  });

  if (input.mission) {
    const m = input.mission;
    tasks.push({
      id: "mission",
      title: m.started ? `Continue: ${m.title}` : `Start a situation: ${m.title}`,
      detail: m.next ? `Next step: ${STEP_LABEL[m.next]}.` : "Mission complete — repeat any step to keep it fresh.",
      to: `/situations/${m.packId}`,
      minutes: 8,
      done: input.missionTodayDone,
    });
  }

  if (input.topError) {
    tasks.push({
      id: "error",
      title: `Fix a habit: ${input.topError.label}`,
      detail: input.topError.lessonId ? "Read the short lesson and pass the quiz." : "Practise with exercises made for you.",
      to: input.topError.lessonId ? `/grammar/${input.topError.lessonId}` : "/mistakes",
      minutes: 5,
      done: input.grammarTodayDone,
    });
  }

  tasks.push({
    id: "listen",
    title: "Train your ear",
    detail: "A quick dictation round: listen and write what you hear.",
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
  const started = SITUATIONS.filter((s) => {
    const n = stepsCount(progress[s.id]?.steps);
    return n > 0 && n < 4;
  }).sort((a, b) => (progress[b.id]?.updated_at ?? "").localeCompare(progress[a.id]?.updated_at ?? ""));
  const pack = started[0] ?? sortSituations(SITUATIONS, profile.current_level, progress)[0];

  const top = summarizeErrors(errorRows).stats[0];

  return {
    today,
    events: (ev ?? []) as PlanEvent[],
    dueReviews: due,
    mission: pack
      ? { packId: pack.id, title: pack.title, started: stepsCount(progress[pack.id]?.steps) > 0, next: nextStep(progress[pack.id]?.steps) }
      : null,
    topError: top ? { type: top.type, label: errorLabel(top.type), lessonId: lessonsForError(top.type)[0]?.id ?? null } : null,
    missionsThisWeek: situationRows.filter(updatedWeek).length,
    missionTodayDone: situationRows.some(updatedToday),
    grammarTodayDone: grammarRows.some(updatedToday),
  };
}
