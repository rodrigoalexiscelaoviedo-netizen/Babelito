import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  supported: true,
  tools: vi.fn<() => Promise<boolean>>(),
  profile: { id: "u1", name: "Ana", current_level: "A2" } as Record<string, unknown> | null,
}));

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ profile: h.profile }) }));
vi.mock("../lib/geminiTools", () => ({ geminiToolsAvailable: () => h.tools() }));
vi.mock("../lib/liveSession", async (orig) => {
  const actual = await orig<typeof import("../lib/liveSession")>();
  class FakeLiveSession {
    start() {
      return Promise.resolve();
    }
    stop() {}
  }
  return { ...actual, liveSupported: () => h.supported, LiveSession: FakeLiveSession };
});
vi.mock("../lib/xp", () => ({ awardXp: vi.fn() }));

import LivePage from "../pages/LivePage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/live"]}>
      <LivePage />
    </MemoryRouter>
  );
}

describe("LivePage (/live)", () => {
  beforeEach(() => {
    h.supported = true;
    h.profile = { id: "u1", name: "Ana", current_level: "A2" };
    h.tools.mockReset();
  });

  it("navegador sin soporte: muestra 'Not available' y no el selector", async () => {
    h.supported = false;
    renderPage();
    expect(await screen.findByText("Not available here")).toBeInTheDocument();
    expect(screen.queryByText("Pick a call")).not.toBeInTheDocument();
    expect(h.tools).not.toHaveBeenCalled();
  });

  it("servidor sin Live: muestra 'Not available' y no el selector", async () => {
    h.tools.mockResolvedValue(false);
    renderPage();
    expect(await screen.findByText("Not available here")).toBeInTheDocument();
    expect(screen.queryByText("Pick a call")).not.toBeInTheDocument();
  });

  it("disponible: abre el selector de llamada", async () => {
    h.tools.mockResolvedValue(true);
    renderPage();
    expect(await screen.findByText("Pick a call")).toBeInTheDocument();
  });

  it("mientras consulta la disponibilidad no muestra ni selector ni error", () => {
    h.tools.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText("Pick a call")).not.toBeInTheDocument();
    expect(screen.queryByText("Not available here")).not.toBeInTheDocument();
  });

  it("sin sesión no renderiza nada", async () => {
    h.profile = null;
    h.tools.mockResolvedValue(true);
    const { container } = renderPage();
    await waitFor(() => expect(h.tools).not.toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
