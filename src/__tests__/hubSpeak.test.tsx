import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ liveOk: true }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "u1", learning_language: "en" } }),
}));
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/srs", () => ({
  countDue: vi.fn().mockResolvedValue(0),
  deckSize: vi.fn().mockResolvedValue(0),
}));
vi.mock("../lib/geminiTools", () => ({ geminiToolsAvailable: () => Promise.resolve(h.liveOk) }));
vi.mock("../lib/liveSession", async (orig) => {
  const actual = await orig<typeof import("../lib/liveSession")>();
  return { ...actual, liveSupported: () => true };
});

import Hub from "../pages/Hub";

function renderSpeak() {
  return render(
    <MemoryRouter>
      <Hub id="speak" />
    </MemoryRouter>
  );
}

describe("Speak hub", () => {
  beforeEach(() => {
    h.liveOk = true;
  });

  it("muestra Chat como tarjeta principal enlazada a /conversation", () => {
    renderSpeak();
    expect(screen.getByText("Start here")).toBeInTheDocument();
    const chat = screen.getByRole("link", { name: /Chat/ });
    expect(chat).toHaveAttribute("href", "/conversation");
  });

  it("IA Live aparece aparte y enlaza a /live cuando Live está disponible", async () => {
    renderSpeak();
    const live = await screen.findByRole("link", { name: /IA Live/ });
    expect(live).toHaveAttribute("href", "/live");
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("IA Live no aparece si el servidor no tiene Live", async () => {
    h.liveOk = false;
    renderSpeak();
    await waitFor(() => expect(screen.getByRole("link", { name: /Chat/ })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /IA Live/ })).not.toBeInTheDocument();
  });

  it("sigue mostrando las otras herramientas de Speak", () => {
    renderSpeak();
    for (const name of ["Situations", "Pronunciation", "Fix my writing"]) {
      expect(screen.getByRole("link", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });
});
