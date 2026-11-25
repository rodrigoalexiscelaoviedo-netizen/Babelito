import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  handlers: null as null | Record<string, (...args: unknown[]) => void>,
  inserts: [] as Array<{ table: string; rows: unknown }>,
  profileUpdates: [] as Array<Record<string, unknown>>,
  coach: "",
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (rows: unknown) => {
        h.inserts.push({ table, rows });
        const result = Promise.resolve({ error: null });
        return Object.assign(result, { select: () => ({ single: () => Promise.resolve({ data: { id: "s1" }, error: null }) }) });
      },
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { profile_json: { interests: "music" } }, error: null }) }) }),
      update: (values: Record<string, unknown>) => {
        h.profileUpdates.push(values);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    }),
  },
}));
vi.mock("../lib/claude", () => ({ askCoach: () => Promise.resolve(h.coach), RetryableError: class extends Error {} }));
vi.mock("../lib/geminiTools", () => ({ liveReport: () => Promise.resolve(null) }));
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));
vi.mock("../components/ShadowingBlock", () => ({ default: ({ text }: { text: string }) => <p>repeat:{text}</p> }));
vi.mock("../lib/liveSession", async (orig) => {
  const actual = await orig<typeof import("../lib/liveSession")>();
  class FakeLiveSession {
    constructor(handlers: Record<string, (...args: unknown[]) => void>) {
      h.handlers = handlers;
    }
    start() {
      return Promise.resolve();
    }
    stop() {}
  }
  return { ...actual, LiveSession: FakeLiveSession };
});

import LiveCall from "../components/LiveCall";
import { liveSystemPrompt, normalizeCorrection, LOG_CORRECTION_TOOL } from "../lib/liveSession";
import { mistakesFromCorrections, parseReview, toTurns, transcriptChunks, readScoreHistory } from "../lib/liveReview";

const turns = toTurns([
  { who: "coach", text: "Hi! How was your weekend?" },
  { who: "learner", text: "I go to the beach yesterday with my friends and we eat fish" },
  { who: "coach", text: "Nice. What did you like?" },
  { who: "learner", text: "I like the sea because is very calm and the water was warm and clear all day" },
  { who: "learner", text: "   " },
]);

const answer = (mistakes: unknown[], scores = { grammar: 62, vocabulary: 55, fluency: 140 }) =>
  JSON.stringify({ mistakes, scores, scoreNote: "Use the past simple." });

describe("revisión de la llamada (puras)", () => {
  it("descarta citas que la persona no dijo, corrige el turno y limita las notas", () => {
    const r = parseReview(
      answer([
        { line: 99, said: "I go to the beach yesterday", better: "I went to the beach yesterday.", type: "verb_tense", why: "Past." },
        { line: 1, said: "I has a dog", better: "I have a dog.", type: "verb_tense", why: "Invented." },
        { line: 3, said: "because is very calm", better: "because it is very calm", type: "made_up", why: "Subject." },
        { line: 0, said: "How was your weekend", better: "How was your week?", type: "other", why: "Coach line." },
      ]),
      turns
    )!;
    expect(r.mistakes.map((m) => [m.turn, m.type])).toEqual([[1, "verb_tense"], [3, "other"]]);
    expect(r.scores).toEqual({ grammar: 62, vocabulary: 55, fluency: 100 });
  });

  it("no puntúa si se habló muy poco y devuelve null con basura", () => {
    const short = toTurns([{ who: "learner", text: "Yes I like it" }]);
    expect(parseReview(answer([]), short)!.scores).toBeNull();
    expect(parseReview("nope", turns)).toBeNull();
  });

  it("parte transcripciones largas en mensajes que el proxy acepta", () => {
    const long = toTurns(Array.from({ length: 60 }, (_, i) => ({ who: (i % 2 ? "coach" : "learner") as "coach" | "learner", text: "word ".repeat(100) })));
    const chunks = transcriptChunks(long);
    expect(chunks.length).toBeLessThanOrEqual(4);
    expect(chunks.every((c) => c.length <= 4000)).toBe(true);
    expect(chunks[chunks.length - 1]).toContain("coach:");
  });

  it("las correcciones en vivo sirven de respaldo, sin repetidos y con tipo válido", () => {
    const c = { original: "I go yesterday", correction: "I went yesterday", explanation: "Past", type: "verb_tense" };
    expect(mistakesFromCorrections([c, c])).toHaveLength(1);
    expect(mistakesFromCorrections([{ ...c, type: undefined }])[0].type).toBe("other");
    expect(normalizeCorrection({ original: "a", correction: "b", explanation: "c", type: "article" }).type).toBe("article");
    expect(LOG_CORRECTION_TOOL.parameters.required).toContain("type");
    expect(readScoreHistory({ liveScores: [{ at: "x", grammar: 1 }, null] })).toEqual([]);
  });

  it("el prompt pide repreguntar, y en situaciones profundizar", () => {
    expect(liveSystemPrompt({ level: "B1", name: "Ana", topic: null })).toContain("something specific the learner just said");
    const p = liveSystemPrompt({ level: "B1", name: "Ana", topic: null, situation: { title: "t", coachRole: "r", opening: "o", description: "d" } });
    expect(p).toContain("probe vague answers");
  });
});

describe("LiveCall: al colgar", () => {
  beforeEach(() => {
    h.inserts.length = 0;
    h.profileUpdates.length = 0;
  });

  function talk() {
    render(<LiveCall userId="u1" level="B1" name="Ana" topic="Your weekend" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Free chat"));
    act(() => {
      const on = h.handlers!;
      on.onState("live");
      on.onSaid("How was your weekend?");
      on.onHeard("I go to the beach yesterday with my friends and we eat some fresh fish");
      on.onCorrection({ original: "I go yesterday", correction: "I went yesterday", explanation: "Past", type: "verb_tense" });
      on.onSaid("Nice, what did you like?");
      on.onHeard("The sea was very calm and the water was warm and clear during all the day");
      on.onSaid("Who went with you?");
      on.onHeard("My two best friends from the university came with me in the car");
    });
    fireEvent.click(screen.getByRole("button", { name: "Hang up" }));
  }

  it("muestra la conversación revisada y guarda sesión, errores y notas", async () => {
    h.coach = answer([{ line: 1, said: "I go to the beach yesterday", better: "I went to the beach yesterday.", type: "verb_tense", why: "Finished past." }]);
    talk();

    expect(await screen.findByText("I went to the beach yesterday.")).toBeInTheDocument();
    expect(await screen.findByText(/now in My mistakes/)).toBeInTheDocument();

    const session = h.inserts.find((i) => i.table === "sessions")!.rows as Record<string, unknown>;
    expect(session).toMatchObject({ session_type: "conversation", completed: true, turn_count: 3, topic: "Your weekend" });
    expect(h.inserts.find((i) => i.table === "errors")!.rows).toEqual([
      expect.objectContaining({ session_id: "s1", error_type: "verb_tense", correction: "I went to the beach yesterday." }),
    ]);
    await waitFor(() => expect(h.profileUpdates).toHaveLength(1));
    // Las notas se agregan sin pisar el resto del perfil.
    expect(h.profileUpdates[0].profile_json).toMatchObject({ interests: "music", liveScores: [expect.objectContaining({ grammar: 62 })] });
    expect(h.inserts).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Say it better" }));
    expect(screen.getByText("repeat:I went to the beach yesterday.")).toBeInTheDocument();
  });

  it("si la revisión falla, guarda las correcciones dadas en la llamada", async () => {
    h.coach = "not json";
    talk();

    expect(await screen.findByText(/couldn't review the call/)).toBeInTheDocument();
    expect(await screen.findByText(/now in My mistakes/)).toBeInTheDocument();
    expect(h.inserts.find((i) => i.table === "errors")!.rows).toEqual([
      expect.objectContaining({ error_type: "verb_tense", original_text: "I go yesterday" }),
    ]);
    expect(h.profileUpdates).toHaveLength(0);
  });
});
