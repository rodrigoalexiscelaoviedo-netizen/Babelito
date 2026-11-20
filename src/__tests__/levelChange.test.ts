import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  current: "A2" as string | null,
  updates: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<Record<string, unknown>>,
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { current_level: h.current }, error: null }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: () => {
          h.updates.push({ table, ...values });
          return Promise.resolve({ error: null });
        },
      }),
      insert: (values: Record<string, unknown>) => {
        h.inserts.push({ table, ...values });
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { applyDiagnosticLevel, diagnosticReason } from "../lib/levelChange";

describe("diagnosticReason", () => {
  it("cambio de nivel: indica de dónde y a dónde", () => {
    expect(diagnosticReason("A2", "B1")).toBe("test de nivel: pasó de A2 a B1");
  });
  it("mismo nivel: queda como confirmación", () => {
    expect(diagnosticReason("A2", "A2")).toBe("test de nivel: confirmó A2");
  });
  it("sin nivel previo: se trata como confirmación", () => {
    expect(diagnosticReason(null, "B1")).toBe("test de nivel: confirmó B1");
  });
});

describe("applyDiagnosticLevel", () => {
  beforeEach(() => {
    h.current = "A2";
    h.updates.length = 0;
    h.inserts.length = 0;
  });

  it("actualiza el perfil y registra el cambio en el historial", async () => {
    await applyDiagnosticLevel("u1", "B1");
    expect(h.updates).toEqual([
      { table: "profiles", diagnosed_level: "B1", current_level: "B1", diagnostic_complete: true },
    ]);
    expect(h.inserts).toEqual([
      { table: "level_history", user_id: "u1", from_level: "A2", to_level: "B1", score: null, reason: "test de nivel: pasó de A2 a B1" },
    ]);
  });

  it("repetir el test con el mismo nivel igual deja registro (es evidencia)", async () => {
    await applyDiagnosticLevel("u1", "A2");
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0]).toMatchObject({ from_level: "A2", to_level: "A2", reason: "test de nivel: confirmó A2" });
  });

  it("sin nivel previo, el origen queda igual al resultado", async () => {
    h.current = null;
    await applyDiagnosticLevel("u1", "A1");
    expect(h.inserts[0]).toMatchObject({ from_level: "A1", to_level: "A1" });
  });
});
