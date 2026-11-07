/**
 * Colores de marca para usos en JS (SVG, gráficos, confeti) y cambio de tema.
 * Los valores reales viven en index.css como variables; acá se leen del tema activo.
 * En className usá siempre las clases de Tailwind (text-coral, bg-gold/20, ...).
 */
export type Theme = "day" | "night";

const STORAGE_KEY = "babelito:theme";
const THEME_COLOR: Record<Theme, string> = { day: "#F7F3EA", night: "#0E1320" };

const FALLBACK = {
  day: { "--coral": "#E8460F", "--mint": "#12965C", "--gold": "#F2A20C", "--ink-900": "#F7F3EA", "--ink-600": "#E8E1D2", "--paper-muted": "#686358" },
  night: { "--coral": "#FF6B5E", "--mint": "#36C5A8", "--gold": "#F6C445", "--ink-900": "#0E1320", "--ink-600": "#222C44", "--paper-muted": "#8A93A8" },
} as const;

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "day";
  return document.documentElement.dataset.theme === "night" ? "night" : "day";
}

/** "232 70 15" (variable CSS) → "#e8460f". Si no se puede leer, usa el valor del tema. */
function cssColor(name: keyof (typeof FALLBACK)["day"]): string {
  const fallback = FALLBACK[currentTheme()][name];
  if (typeof document === "undefined") return fallback;
  const parts = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return "#" + parts.map((n) => n.toString(16).padStart(2, "0")).join("");
}

export const BRAND = {
  get coral() { return cssColor("--coral"); },
  get mint() { return cssColor("--mint"); },
  get gold() { return cssColor("--gold"); },
  get ink900() { return cssColor("--ink-900"); },
  get ink600() { return cssColor("--ink-600"); },
  get paperMuted() { return cssColor("--paper-muted"); },
};

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* sin almacenamiento: dura hasta cerrar la pestaña */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}
