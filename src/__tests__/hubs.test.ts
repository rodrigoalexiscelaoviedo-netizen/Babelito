import { describe, expect, it } from "vitest";
import { HUBS, hubForPath, visibleItems } from "../lib/hubs";

describe("hubs", () => {
  it("has the 4 hubs with unique paths and every tool in exactly one hub", () => {
    expect(HUBS.map((h) => h.id)).toEqual(["speak", "learn", "remember", "me"]);
    const all = HUBS.flatMap((h) => h.items.map((i) => i.to));
    expect(new Set(all).size).toBe(all.length);
    for (const route of ["/conversation", "/situations", "/roleplay", "/sounds", "/correct", "/stories", "/reading", "/listening", "/dictation", "/lens", "/review", "/words", "/chunks", "/grammar", "/mistakes", "/progress", "/plan", "/profile"]) {
      expect(all, route).toContain(route);
    }
  });

  it("each hub has exactly one featured tool", () => {
    for (const h of HUBS) expect(h.items.filter((i) => i.featured).length, h.id).toBe(1);
  });

  it("every Catalan-visible tool has Catalan text, and the featured tool is always available in Catalan", () => {
    for (const h of HUBS) {
      const ca = visibleItems(h, "ca");
      expect(ca.length, h.id).toBeGreaterThan(0);
      for (const i of ca) expect(i.text.title.length, i.to).toBeGreaterThan(0);
      expect(h.items.find((i) => i.featured)?.ca, h.id).toBeDefined();
    }
  });

  it("hides English-only tools in Catalan but shows them in English", () => {
    const remember = HUBS.find((h) => h.id === "remember")!;
    expect(visibleItems(remember, "ca").map((i) => i.to)).not.toContain("/grammar");
    expect(visibleItems(remember, "en").map((i) => i.to)).toContain("/grammar");
  });

  it("maps any route (including detail pages) to its hub", () => {
    expect(hubForPath("/review")?.id).toBe("remember");
    expect(hubForPath("/situations/airport")?.id).toBe("speak");
    expect(hubForPath("/grammar/past-simple")?.id).toBe("remember");
    expect(hubForPath("/remember")?.id).toBe("remember");
    expect(hubForPath("/profile")?.id).toBe("me");
    expect(hubForPath("/")).toBeNull();
  });
});
