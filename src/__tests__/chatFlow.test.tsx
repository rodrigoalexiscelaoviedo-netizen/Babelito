import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  askCoach: vi.fn<(args: { system: string; messages: Array<{ role: string; content: string }> }) => Promise<string>>(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      id: "u1",
      name: "Ana",
      learning_language: "en",
      current_level: "A2",
      english_variant: "British",
      diagnostic_complete: true,
    },
    refreshProfile: vi.fn(),
  }),
}));

// Supabase: las listas vuelven vacías; .single() devuelve la sesión creada (id "s1"); sin errores.
vi.mock("../lib/supabaseClient", () => {
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (typeof prop === "symbol") return undefined;
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve({ data: { id: "s1" }, error: null });
      return () => chain;
    },
    apply() {
      return chain;
    },
  });
  return { supabase: { from: () => chain, rpc: () => chain } };
});

vi.mock("../lib/claude", async (orig) => {
  const actual = await orig<typeof import("../lib/claude")>();
  return { ...actual, askCoach: (args: { system: string; messages: Array<{ role: string; content: string }> }) => h.askCoach(args) };
});

vi.mock("../lib/speech", () => ({
  speechSupported: () => false,
  speak: vi.fn(),
  pauseSpeech: vi.fn(),
  resumeSpeech: vi.fn(),
  stopSpeech: vi.fn(),
}));
vi.mock("../lib/useSpeechCapture", () => ({
  useSpeechCapture: () => ({ start: vi.fn(), stop: vi.fn(), isRecording: false, finalText: "", interim: "", error: "" }),
}));
vi.mock("../lib/useVoicePrefs", () => ({
  useVoicePrefs: () => ({ voiceName: null, voiceRate: 1, voiceAccent: "en-GB" }),
}));
vi.mock("../lib/useResumableSession", () => ({
  useResumableSession: () => ({ session: null, dismiss: vi.fn() }),
}));
vi.mock("../lib/geminiTools", () => ({ geminiToolsAvailable: () => Promise.resolve(false) }));
vi.mock("../lib/xp", () => ({ awardSessionXp: vi.fn().mockResolvedValue(0), awardXp: vi.fn() }));
vi.mock("../lib/achievements", () => ({
  checkAchievements: vi.fn().mockResolvedValue([]),
  markSeen: vi.fn(),
}));
vi.mock("../lib/hints", () => ({ requestHint: vi.fn().mockResolvedValue("hint") }));
vi.mock("../lib/sessionReport", () => ({ generateReport: vi.fn() }));

import Conversation from "../pages/Conversation";

function renderChat() {
  return render(
    <MemoryRouter>
      <Conversation />
    </MemoryRouter>
  );
}

describe("Chat (/conversation)", () => {
  beforeEach(() => {
    h.askCoach.mockReset();
  });

  it("pantalla de inicio: temas y 'Start talking', sin botón Call (quitado en la fase 1)", () => {
    renderChat();
    expect(screen.getByText("What should we talk about?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start talking/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start voice call" })).not.toBeInTheDocument();
  });

  it("empezar muestra el chat con la apertura del coach y el campo de mensaje", async () => {
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: /Start talking/ }));
    expect(await screen.findByRole("textbox", { name: "Message" })).toBeInTheDocument();
    // La apertura del coach es una pregunta: debe haber al menos un mensaje del coach visible.
    expect(screen.getByText(/\?/)).toBeInTheDocument();
  });

  it("enviar un mensaje lo manda a la IA con el historial y muestra la respuesta del coach", async () => {
    h.askCoach.mockResolvedValue("That sounds lovely, tell me more about it.");
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: /Start talking/ }));

    const box = await screen.findByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "I like cooking pasta" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("That sounds lovely, tell me more about it.")).toBeInTheDocument();
    expect(h.askCoach).toHaveBeenCalledTimes(1);
    const sent = h.askCoach.mock.calls[0][0];
    expect(sent.messages.at(-1)).toEqual({ role: "user", content: "I like cooking pasta" });
    expect(typeof sent.system).toBe("string");
    expect(sent.system.length).toBeGreaterThan(0);
  });

  it("si la IA falla, muestra el error en el chat en vez de quedarse en silencio", async () => {
    h.askCoach.mockRejectedValue(new Error("Sin conexión con el coach"));
    renderChat();
    fireEvent.click(screen.getByRole("button", { name: /Start talking/ }));

    const box = await screen.findByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByText(/Sin conexión con el coach/)).toBeInTheDocument());
  });
});
