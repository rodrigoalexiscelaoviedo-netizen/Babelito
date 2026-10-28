import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/claude", () => ({ askCoach: vi.fn() }));
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));

import { buildPlan, weekdayLabel, type PlanInput } from "../lib/plan";
import { buildLadder } from "../lib/levelLadder";

const TODAY = "2026-10-28";
// Mediodía UTC: cae en el mismo día local en cualquier zona razonable.
const at = (date: string, source: string) => ({ source, created_at: `${date}T12:00:00Z` });

const base: PlanInput = {
  today: TODAY,
  events: [],
  dueReviews: 0,
  mission: { packId: "airport", title: "At the airport", started: false, next: "phrases" },
  topError: { type: "verb_tense", label: "Tiempo verbal", lessonId: "past-simple" },
  missionsThisWeek: 0,
  missionTodayDone: false,
  grammarTodayDone: false,
};

describe("weekdayLabel", () => {
  it("returns a short English weekday", () => {
    expect(weekdayLabel("2026-10-28")).toBe("Wed");
  });
});

describe("buildPlan", () => {
  it("builds the default tasks without a review task when nothing is due", () => {
    const p = buildPlan(base);
    expect(p.tasks.map((t) => t.id)).toEqual(["talk", "mission", "error", "listen"]);
    expect(p.doneToday).toBe(0);
  });

  it("adds a review task when items are due and sizes it", () => {
    const p = buildPlan({ ...base, dueReviews: 12 });
    expect(p.tasks[0]).toMatchObject({ id: "review", title: "Review 12 items", to: "/review", done: false });
  });

  it("marks tasks done from today's activity", () => {
    const p = buildPlan({
      ...base,
      dueReviews: 0,
      events: [at(TODAY, "review"), at(TODAY, "conversation"), at(TODAY, "listening")],
      missionTodayDone: true,
      grammarTodayDone: true,
    });
    expect(p.tasks.every((t) => t.done)).toBe(true);
    expect(p.doneToday).toBe(p.tasks.length);
  });

  it("links the error task to the lesson when there is one, else to My mistakes", () => {
    expect(buildPlan(base).tasks.find((t) => t.id === "error")?.to).toBe("/grammar/past-simple");
    const p = buildPlan({ ...base, topError: { type: "other", label: "Otro", lessonId: null } });
    expect(p.tasks.find((t) => t.id === "error")?.to).toBe("/mistakes");
  });

  it("skips mission and error tasks when there is nothing to suggest", () => {
    const p = buildPlan({ ...base, mission: null, topError: null });
    expect(p.tasks.map((t) => t.id)).toEqual(["talk", "listen"]);
  });

  it("counts the week: active days and goals", () => {
    const p = buildPlan({
      ...base,
      events: [at("2026-10-26", "conversation"), at("2026-10-26", "review"), at("2026-10-27", "roleplay"), at(TODAY, "review")],
      missionsThisWeek: 1,
    });
    expect(p.days).toHaveLength(7);
    expect(p.days[6]).toMatchObject({ date: TODAY, isToday: true, active: true });
    expect(p.days.filter((d) => d.active)).toHaveLength(3);
    const goal = (id: string) => p.goals.find((g) => g.id === id)!;
    expect(goal("days").current).toBe(3);
    expect(goal("speaking").current).toBe(2);
    expect(goal("review").current).toBe(2);
    expect(goal("missions").current).toBe(1);
  });
});

describe("buildLadder", () => {
  const evidence = { sessions7d: 0, errors7d: 0, avgEase: null, diagnosed: null, situationsDone: 0, grammarPassed: 0 };

  it("marks rungs and points to the next level", () => {
    const l = buildLadder("B1", evidence);
    expect(l.rungs.map((r) => r.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(l.next).toBe("B2");
    expect(l.readiness).toBeNull();
    expect(l.goals.length).toBeGreaterThan(0);
  });

  it("has no next level or goals at C1", () => {
    const l = buildLadder("C1", evidence);
    expect(l.next).toBeNull();
    expect(l.goals).toEqual([]);
  });

  it("reports readiness and flags goals that are met", () => {
    const l = buildLadder("A2", { sessions7d: 4, errors7d: 2, avgEase: 2.5, diagnosed: "A2", situationsDone: 2, grammarPassed: 1 });
    expect(l.readiness).toBeGreaterThanOrEqual(75);
    expect(l.message).toContain("ready for B1");
    const g = (id: string) => l.goals.find((x) => x.id === id)!;
    expect(g("sessions").met).toBe(true);
    expect(g("review").met).toBe(true);
    expect(g("situations").met).toBe(true);
    expect(g("grammar").met).toBe(false);
    expect(g("grammar").counts).toBe(false);
  });

  it("is not ready with too few sessions even with a high score", () => {
    const l = buildLadder("A2", { sessions7d: 1, errors7d: 0, avgEase: 2.5, diagnosed: "A2", situationsDone: 0, grammarPassed: 0 });
    expect(l.message).not.toContain("ready for");
  });
});
