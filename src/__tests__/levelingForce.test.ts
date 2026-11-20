import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ calls: 0 }));

vi.mock("../lib/supabaseClient", () => {
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (typeof prop === "symbol") return undefined;
      if (prop === "then") {
        h.calls++;
        return (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      }
      return () => chain;
    },
    apply() {
      return chain;
    },
  });
  return { supabase: { from: () => chain } };
});

import { consolidateLevel } from "../lib/leveling";
import { localDateISO } from "../lib/dates";

const base = { id: "u1", current_level: "A2" as const, diagnosed_level: "A2" };

describe("consolidateLevel: cuándo recalcula", () => {
  beforeEach(() => {
    h.calls = 0;
  });

  it("sin force, si ya se recalculó hoy no consulta nada (regla diaria del Dashboard)", async () => {
    const r = await consolidateLevel({ ...base, level_updated_on: localDateISO() });
    expect(r).toEqual({ changed: false, level: "A2" });
    expect(h.calls).toBe(0);
  });

  it("con force, recalcula aunque ya se haya hecho hoy (fin de sesión)", async () => {
    await consolidateLevel({ ...base, level_updated_on: localDateISO() }, { force: true });
    expect(h.calls).toBeGreaterThan(0);
  });

  it("sin nada previo, recalcula", async () => {
    await consolidateLevel({ ...base, level_updated_on: null });
    expect(h.calls).toBeGreaterThan(0);
  });
});
