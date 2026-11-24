import { describe, it, expect } from "vitest";
import { buildSwitchUpdate } from "../lib/studyLanguage";

const base = {
  learning_language: "en",
  current_level: "B2",
  onboarding_complete: true,
  profile_json: { interests: "music" },
};

describe("cambio de idioma: nivel, objetivo y alta por idioma", () => {
  it("al pasar a catalán guarda el nivel y objetivo de inglés y manda a la prueba de nivel", () => {
    const u = buildSwitchUpdate(base, "ca", "C1", "music");
    expect(u.learning_language).toBe("ca");
    expect(u.current_level).toBeNull();
    expect(u.diagnostic_complete).toBe(false);
    expect(u.target_level).toBe("C1");
    const pj = u.profile_json as { levels: Record<string, string>; targets: Record<string, string>; onboarded: Record<string, boolean>; interests: string };
    expect(pj.levels.en).toBe("B2");
    expect(pj.onboarded.en).toBe(true);
    expect(pj.interests).toBe("music");
  });

  it("al volver a inglés recupera el nivel y el objetivo de inglés", () => {
    const toCa = buildSwitchUpdate(base, "ca", "C1", "music");
    const back = buildSwitchUpdate(
      { learning_language: "ca", current_level: "A2", onboarding_complete: true, profile_json: toCa.profile_json },
      "en",
      "C1",
      "music"
    );
    expect(back.current_level).toBe("B2");
    expect(back.diagnostic_complete).toBe(true);
    expect(back.target_level).toBe("C1");
    const pj = back.profile_json as { levels: Record<string, string> };
    expect(pj.levels.ca).toBe("A2");
  });

  it("un idioma sin alta previa manda al alta", () => {
    const u = buildSwitchUpdate(base, "ca", "B2", "music");
    expect(u.onboarding_complete).toBe(false);
  });

  it("un idioma con alta previa no vuelve a pedirla", () => {
    const withCa = buildSwitchUpdate(base, "ca", "B2", "music");
    const ca = {
      learning_language: "ca",
      current_level: "A2",
      onboarding_complete: false,
      profile_json: { ...(withCa.profile_json as object), onboarded: { en: true, ca: true } },
    };
    const back = buildSwitchUpdate(ca, "en", "B2", "music");
    expect(back.onboarding_complete).toBe(true);
  });

  it("sin cambio de idioma guarda el objetivo del formulario sin tocar niveles", () => {
    const u = buildSwitchUpdate(base, "en", "C1", "music");
    expect(u.current_level).toBe("B2");
    expect(u.diagnostic_complete).toBe(true);
    expect(u.target_level).toBe("C1");
    const pj = u.profile_json as { targets: Record<string, string> };
    expect(pj.targets.en).toBe("C1");
  });
});
