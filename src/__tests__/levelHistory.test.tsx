import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  error: null as unknown,
  language: "en",
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "u1", learning_language: h.language } }),
}));
vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: h.rows, error: h.error }),
          }),
        }),
      }),
    }),
  },
}));

import LevelHistory from "../components/LevelHistory";

describe("LevelHistory", () => {
  beforeEach(() => {
    h.rows = [];
    h.error = null;
    h.language = "en";
  });

  it("muestra cada cambio con desde → hasta y el motivo", async () => {
    h.rows = [
      { id: "1", from_level: "A1", to_level: "A2", reason: "sube: buen desempeño sostenido", created_at: "2026-11-10T10:00:00Z" },
      { id: "2", from_level: "A2", to_level: "B1", reason: "baja: necesita reforzar la base", created_at: "2026-11-15T10:00:00Z" },
    ];
    render(<LevelHistory />);
    expect(await screen.findByText("A1 → A2")).toBeInTheDocument();
    expect(screen.getByText("sube: buen desempeño sostenido")).toBeInTheDocument();
    expect(screen.getByText("A2 → B1")).toBeInTheDocument();
    expect(screen.getByText(/Once a day we look at your reviews/)).toBeInTheDocument();
  });

  it("sin cambios muestra el mensaje de estado vacío", async () => {
    render(<LevelHistory />);
    expect(await screen.findByText("No level changes yet. Keep practising and you'll see them here.")).toBeInTheDocument();
  });

  it("si la consulta falla, muestra el estado vacío (no rompe la pantalla)", async () => {
    h.error = { message: "boom" };
    render(<LevelHistory />);
    expect(await screen.findByText(/No level changes yet/)).toBeInTheDocument();
  });

  it("en catalán se muestra con el texto en catalán", async () => {
    h.language = "ca";
    h.rows = [{ id: "1", from_level: "A1", to_level: "A2", reason: "x", created_at: "2026-11-10T10:00:00Z" }];
    render(<LevelHistory />);
    expect(await screen.findByText("Com es mou el teu nivell")).toBeTruthy();
  });
});
