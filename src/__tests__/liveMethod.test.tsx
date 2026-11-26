import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  handlers: null as null | Record<string, (...args: unknown[]) => void>,
  prompt: null as null | Record<string, unknown>,
  sent: [] as string[],
  muted: [] as boolean[],
  coach: "",
  profile: {} as Record<string, unknown>,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("../lib/supabaseClient", () => {
  const query = {
    eq: () => query,
    gte: () => query,
    order: () => query,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: { profile_json: h.profile }, error: null }),
  };
  return {
    supabase: {
      from: () => ({
        select: () => query,
        insert: () =>
          Object.assign(Promise.resolve({ error: null }), {
            select: () => ({ single: () => Promise.resolve({ data: { id: "s1" }, error: null }) }),
          }),
        update: (values: { profile_json: Record<string, unknown> }) => {
          h.updates.push(values);
          h.profile = values.profile_json;
          return { eq: () => Promise.resolve({ error: null }) };
        },
      }),
    },
  };
});
vi.mock("../lib/claude", () => ({ askCoach: () => Promise.resolve(h.coach), RetryableError: class extends Error {} }));
vi.mock("../lib/geminiTools", () => ({
  liveReport: () => Promise.resolve(null),
  getLiveToken: () => Promise.resolve({ token: "t", model: "m" }),
}));
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));
vi.mock("../lib/liveSession", async (orig) => {
  const actual = await orig<typeof import("../lib/liveSession")>();
  class FakeLiveSession {
    constructor(handlers: Record<string, (...args: unknown[]) => void>, prompt: Record<string, unknown>) {
      h.handlers = handlers;
      h.prompt = prompt;
    }
    start() {
      return Promise.resolve();
    }
    stop() {}
    outputLevel() {
      return 0;
    }
    sendInstruction(text: string) {
      h.sent.push(text);
    }
    setMuted(m: boolean) {
      h.muted.push(m);
    }
  }
  return { ...actual, LiveSession: FakeLiveSession };
});

import LiveCall from "../components/LiveCall";
import { buildSetupMessage, liveSystemPrompt, patienceMs } from "../lib/liveSession";
import { goalsFor, LIVE_GOALS } from "../lib/liveGoals";
import { SITUATIONS } from "../lib/situationsData";
import { mergeMemory, readMemory } from "../lib/liveReview";
import { parseSuggestions } from "../lib/liveHelp";

beforeEach(() => {
  h.sent.length = 0;
  h.muted.length = 0;
  h.updates.length = 0;
  h.profile = { liveMemory: ["Has a dog called Toby"] };
  window.localStorage.clear();
});

describe("método de la llamada (puras)", () => {
  it("cada situación tiene tres objetivos", () => {
    expect(SITUATIONS.every((s) => goalsFor(s.id).length === 3)).toBe(true);
    expect(Object.keys(LIVE_GOALS)).toHaveLength(SITUATIONS.length);
  });

  it("espera más a quien tiene menos nivel", () => {
    expect(patienceMs("A1")).toBeGreaterThan(patienceMs("B1"));
    expect(JSON.stringify(buildSetupMessage("m", "p", "Aoede", [], 1200))).toContain('"silenceDurationMs":1200');
    expect(JSON.stringify(buildSetupMessage("m", "p"))).not.toContain("realtimeInputConfig");
  });

  it("el prompt cambia con el estilo de corrección y usa memoria solo en charla libre", () => {
    const base = { level: "B1", name: "Ana", topic: null, memory: ["Likes hiking"], goals: ["Order food"] };
    expect(liveSystemPrompt({ ...base, correction: "gentle" })).toContain("Never say the correction out loud");
    expect(liveSystemPrompt({ ...base, correction: "strict" })).toContain("At most one tip per turn");
    expect(liveSystemPrompt(base)).toContain("could confuse a listener");
    expect(liveSystemPrompt(base)).toContain("Likes hiking");
    expect(liveSystemPrompt(base)).toContain("1) Order food");
    const situation = { title: "t", coachRole: "r", opening: "o", description: "d" };
    expect(liveSystemPrompt({ ...base, situation })).not.toContain("Likes hiking");
  });

  it("memoria sin repetidos y con tope; ideas mal formadas se descartan", () => {
    expect(mergeMemory(["Has a dog"], ["has a dog!", "Likes tea"])).toEqual(["Has a dog", "Likes tea"]);
    expect(
      mergeMemory(
        Array.from({ length: 12 }, (_, i) => `fact ${i}`),
        ["new one"]
      )
    ).toHaveLength(12);
    expect(readMemory({ liveMemory: [1, "", "ok"] })).toEqual(["ok"]);
    expect(parseSuggestions('{"replies":[{"en":"Yes, I do.","es":"Sí."},{"es":"x"}]}')).toEqual([{ en: "Yes, I do.", es: "Sí." }]);
  });
});

describe("pantalla de la llamada", () => {
  async function open() {
    render(<LiveCall userId="u1" level="B1" name="Ana" topic={null} onClose={vi.fn()} />);
    await screen.findByText(/What your coach remembers/);
  }

  const goLive = () =>
    act(() => {
      h.handlers!.onState("live");
      h.handlers!.onSaid("What did you do last weekend?");
    });

  it("manda la corrección elegida y la memoria; los botones piden sin colgar", async () => {
    await open();
    fireEvent.click(screen.getByRole("radio", { name: "After the call" }));
    fireEvent.click(screen.getByText("Free chat"));
    expect(h.prompt).toMatchObject({ correction: "gentle", memory: ["Has a dog called Toby"] });
    goLive();

    fireEvent.click(screen.getByRole("button", { name: "Slower" }));
    expect(h.sent[0]).toContain("more slowly");

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(h.muted).toEqual([true]);
    expect(screen.getByText("You're muted")).toBeInTheDocument();

    h.coach = '{"replies":[{"en":"I went hiking.","es":"Fui de excursión."}]}';
    fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    expect(await screen.findByText("I went hiking.")).toBeInTheDocument();

    h.coach = "¿Qué hiciste el finde?";
    fireEvent.click(screen.getByRole("button", { name: /In Spanish/ }));
    expect(await screen.findByText("¿Qué hiciste el finde?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    expect(screen.queryByText("What did you do last weekend?")).not.toBeInTheDocument();
  });

  it("los objetivos se tildan y salen en el resumen; el roleplay no deja recuerdos", async () => {
    await open();
    const restaurant = SITUATIONS.find((s) => s.id === "restaurant")!;
    fireEvent.click(screen.getByText(restaurant.title));
    goLive();
    act(() => h.handlers!.onGoal(1));
    expect(screen.getByText("Order food and a drink").closest("li")).toHaveTextContent("(done)");

    h.coach = '{"mistakes":[],"scores":null,"facts":["Is allergic to nuts"]}';
    act(() => h.handlers!.onHeard("I would like the soup please and a glass of water thank you"));
    fireEvent.click(screen.getByRole("button", { name: "Hang up" }));
    expect(screen.getByText("Goals: 1 of 3")).toBeInTheDocument();
    expect(await screen.findByText("Call saved.")).toBeInTheDocument();
    expect(JSON.stringify(h.updates)).not.toContain("allergic");
  });

  it("la charla libre sí guarda recuerdos nuevos, y se pueden borrar", async () => {
    await open();
    fireEvent.click(screen.getByText("Free chat"));
    goLive();
    h.coach = '{"mistakes":[],"scores":null,"facts":["Plays the guitar"]}';
    act(() => h.handlers!.onHeard("I play the guitar every night"));
    fireEvent.click(screen.getByRole("button", { name: "Hang up" }));
    await waitFor(() => expect(h.profile.liveMemory).toEqual(["Has a dog called Toby", "Plays the guitar"]));

    fireEvent.click(screen.getByRole("button", { name: /Pick another/i }));
    fireEvent.click(screen.getByText("Forget everything"));
    fireEvent.click(screen.getByText("Tap again to erase it all"));
    await waitFor(() => expect(h.profile).not.toHaveProperty("liveMemory"));
  });
});

describe("si el servicio rechaza la configuración nueva", () => {
  const sockets: FakeSocket[] = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((e: unknown) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: ((e: { reason: string }) => void) | null = null;
    constructor() {
      sockets.push(this);
    }
    send(data: string) {
      this.sent.push(data);
    }
    close() {}
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reintenta una vez con la configuración básica y, si vuelve a fallar, avisa", async () => {
    const { LiveSession } = await vi.importActual<typeof import("../lib/liveSession")>("../lib/liveSession");
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal(
      "AudioContext",
      class {
        resume = () => Promise.resolve();
        close = () => Promise.resolve();
      }
    );
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) } });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const states: string[] = [];
    const session = new LiveSession({ onState: (s) => states.push(s) }, { level: "B1", name: "Ana", topic: null });
    await session.start();
    sockets[0].onopen!();
    expect(sockets[0].sent[0]).toContain("realtimeInputConfig");
    sockets[0].onclose!({ reason: "invalid argument" });

    await waitFor(() => expect(sockets).toHaveLength(2));
    sockets[1].onopen!();
    expect(sockets[1].sent[0]).not.toContain("realtimeInputConfig");
    expect(sockets[1].sent[0]).not.toContain('"enum"');
    sockets[1].onclose!({ reason: "still bad" });
    expect(states).toEqual(["connecting", "error"]);
  });
});
