/**
 * Datos que dependen del idioma que se estudia: nivel actual, objetivo y si ya
 * se hizo el alta de ese idioma. Se guardan dentro de `profile_json` (sin tablas
 * nuevas) y las columnas del perfil reflejan siempre el idioma activo.
 */

export type StudyLang = "en" | "ca";

export interface PerLangData {
  levels: Record<string, string>;
  targets: Record<string, string>;
  onboarded: Record<string, boolean>;
}

export function perLangData(profileJson: unknown): PerLangData {
  const pj = (profileJson ?? {}) as Record<string, unknown>;
  return {
    levels: { ...((pj.levels as Record<string, string> | undefined) ?? {}) },
    targets: { ...((pj.targets as Record<string, string> | undefined) ?? {}) },
    onboarded: { ...((pj.onboarded as Record<string, boolean> | undefined) ?? {}) },
  };
}

export interface SwitchInput {
  learning_language: string | null;
  current_level: string | null;
  onboarding_complete: boolean;
  profile_json: unknown;
}

export interface SwitchUpdate {
  learning_language: StudyLang;
  current_level: string | null;
  target_level: string;
  diagnostic_complete: boolean;
  onboarding_complete: boolean;
  profile_json: Record<string, unknown>;
}

/**
 * Calcula lo que hay que guardar al cambiar (o confirmar) el idioma y el objetivo.
 * - Guarda nivel, objetivo y alta del idioma que se deja.
 * - Carga nivel, objetivo y alta del idioma elegido.
 * - Sin nivel para el nuevo idioma: se manda a la prueba de nivel.
 * - Sin alta para el nuevo idioma: se manda al alta.
 */
export function buildSwitchUpdate(profile: SwitchInput, next: StudyLang, target: string, interests: string): SwitchUpdate {
  const prev: StudyLang = profile.learning_language === "ca" ? "ca" : "en";
  const pj = (profile.profile_json ?? {}) as Record<string, unknown>;
  const data = perLangData(pj);
  const changed = next !== prev;

  // El idioma que se deja conserva lo suyo; el activo guarda el objetivo del formulario.
  if (changed && profile.current_level) data.levels[prev] = profile.current_level;
  if (changed) data.onboarded[prev] = profile.onboarding_complete;
  data.targets[changed ? prev : next] = target;

  const nextLevel = changed ? (data.levels[next] ?? null) : (profile.current_level ?? null);
  const nextTarget = changed ? (data.targets[next] ?? target) : target;
  const nextOnboarded = changed ? !!data.onboarded[next] : profile.onboarding_complete;
  if (changed) data.targets[next] = nextTarget;

  return {
    learning_language: next,
    current_level: nextLevel,
    target_level: nextTarget,
    diagnostic_complete: nextLevel !== null,
    onboarding_complete: nextOnboarded,
    profile_json: { ...pj, interests, levels: data.levels, targets: data.targets, onboarded: data.onboarded },
  };
}
