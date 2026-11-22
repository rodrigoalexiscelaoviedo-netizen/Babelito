import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  supported: true,
  profile: { id: "u1", name: "Ana", learning_language: "en" } as Record<string, unknown>,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ session: null, profile: h.profile, refreshProfile: vi.fn() }),
}));
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/levelChange", () => ({ applyDiagnosticLevel: vi.fn() }));
vi.mock("../lib/speech", () => ({ speak: vi.fn(), speechSupported: () => true }));
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

import Diagnostic from "../pages/Diagnostic";

// Cada flujo responde 10 preguntas con pausas de 380 ms: con el tope por defecto (5 s) era intermitente.
vi.setConfig({ testTimeout: 20000 });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/diagnostic"]}>
      <Diagnostic />
    </MemoryRouter>
  );
}

/** Espera a que el contador muestre la pregunta n. */
async function waitForQuestion(n: number) {
  await waitFor(() => expect(screen.getByText(`Question ${n}`)).toBeInTheDocument(), { timeout: 2000 });
}

describe("Diagnostic (test de nivel)", () => {
  beforeEach(() => {
    h.supported = true;
    h.profile = { id: "u1", name: "Ana", learning_language: "en" };
  });

  it("muestra la primera pregunta con opciones A–D y 'No lo sé'", async () => {
    renderPage();
    await waitForQuestion(1);
    expect(screen.getByRole("button", { name: /I don't know/ })).toBeInTheDocument();
    expect(document.querySelectorAll("button.card")).toHaveLength(4);
  });

  it("avanza con cada respuesta y no muestra la barra de 26 preguntas", async () => {
    renderPage();
    await waitForQuestion(1);
    fireEvent.click(document.querySelectorAll("button.card")[0] as HTMLElement);
    await waitForQuestion(2);
    expect(screen.queryByText(/26/)).toBeNull();
  });

  it("quien no sabe nada llega a A1 y pasa a la parte oral", async () => {
    renderPage();
    // Contestar siempre "No lo sé" hasta que el motor termine (mínimo 10 ítems).
    for (let n = 1; n <= 10; n++) {
      await waitForQuestion(n);
      fireEvent.click(screen.getByRole("button", { name: /I don't know/ }));
    }
    expect(await screen.findByText("A five-minute conversation", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("saltar la parte oral muestra el resultado sin desglose oral", async () => {
    renderPage();
    for (let n = 1; n <= 10; n++) {
      await waitForQuestion(n);
      fireEvent.click(screen.getByRole("button", { name: /I don't know/ }));
    }
    fireEvent.click(await screen.findByRole("button", { name: /Skip the speaking part/ }, { timeout: 2000 }));
    expect(await screen.findByText("Level assessment", {}, { timeout: 2000 })).toBeInTheDocument();
    // El nivel aparece en grande y en el desglose.
    expect(screen.getAllByText("A1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/No speaking part/)).toBeInTheDocument();
    expect(screen.queryByText(/Speaking with the examiner/)).toBeNull();
  });

  it("sin soporte de voz, la parte oral se omite sola", async () => {
    h.supported = false;
    renderPage();
    for (let n = 1; n <= 10; n++) {
      await waitForQuestion(n);
      fireEvent.click(screen.getByRole("button", { name: /I don't know/ }));
    }
    expect(await screen.findByText("Level assessment", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByText("A five-minute conversation")).toBeNull();
  });

  it("en catalán muestra el test en catalán", async () => {
    h.profile = { id: "u1", name: "Ana", learning_language: "ca" };
    renderPage();
    expect(await screen.findByText("Pregunta 1", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No ho sé/ })).toBeInTheDocument();
  });
});
