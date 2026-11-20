import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const h = vi.hoisted(() => ({ prompts: [] as unknown[], started: 0 }));

vi.mock("../lib/liveSession", async (orig) => {
  const actual = await orig<typeof import("../lib/liveSession")>();
  class FakeLiveSession {
    constructor(_handlers: unknown, prompt: unknown) {
      h.prompts.push(prompt);
    }
    start() {
      h.started++;
      return Promise.resolve();
    }
    stop() {}
  }
  return { ...actual, LiveSession: FakeLiveSession };
});
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));

import LiveCall from "../components/LiveCall";
import { SITUATIONS } from "../lib/situationsData";

function renderCall(onClose = vi.fn()) {
  render(<LiveCall userId="u1" level="A2" name="Ana" topic="Your weekend" onClose={onClose} />);
  return { onClose };
}

describe("LiveCall: selector de modo", () => {
  it("muestra charla libre, sorpresa y todas las situaciones", () => {
    renderCall();
    expect(screen.getByText("Pick a call")).toBeInTheDocument();
    expect(screen.getByText("Free chat")).toBeInTheDocument();
    expect(screen.getByText("Surprise me")).toBeInTheDocument();
    for (const s of SITUATIONS) {
      expect(screen.getByText(s.title)).toBeInTheDocument();
    }
  });

  it("elegir una situación arranca la sesión con el coach como quien llama", () => {
    h.prompts.length = 0;
    h.started = 0;
    renderCall();
    fireEvent.click(screen.getByText(SITUATIONS[0].title));

    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
    expect(h.started).toBe(1);
    const prompt = h.prompts[0] as { situation: { title: string; coachRole: string; opening: string } | null; topic: string | null };
    expect(prompt.situation?.title).toBe(SITUATIONS[0].title);
    expect(prompt.situation?.coachRole).toBe(SITUATIONS[0].roleplay.coachRole);
    expect(prompt.situation?.opening).toBe(SITUATIONS[0].roleplay.opening);
    expect(prompt.topic).toBeNull();
  });

  it("charla libre usa el tema actual y no lleva situación", () => {
    h.prompts.length = 0;
    renderCall();
    fireEvent.click(screen.getByText("Free chat"));
    const prompt = h.prompts[0] as { situation: unknown; topic: string | null };
    expect(prompt.situation).toBeNull();
    expect(prompt.topic).toBe("Your weekend");
  });

  it("sorpresa elige una situación al azar", () => {
    h.prompts.length = 0;
    renderCall();
    fireEvent.click(screen.getByText("Surprise me"));
    const prompt = h.prompts[0] as { situation: { title: string } | null };
    expect(SITUATIONS.map((s) => s.title)).toContain(prompt.situation?.title);
  });

  it("Cancel cierra sin iniciar ninguna sesión", () => {
    h.prompts.length = 0;
    const { onClose } = renderCall();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(h.prompts).toHaveLength(0);
  });
});
