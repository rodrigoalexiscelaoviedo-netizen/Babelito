import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { currentTheme, setTheme, type Theme } from "../lib/theme";

/** Cambia entre Día y Noche. Se recuerda en este dispositivo. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>(currentTheme);
  const next: Theme = theme === "day" ? "night" : "day";

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        setLocal(next);
      }}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-paper-muted transition-colors hover:bg-ink-600 hover:text-paper ${className}`}
      aria-label={next === "night" ? "Switch to night mode" : "Switch to day mode"}
    >
      {theme === "day" ? <Moon size={16} /> : <Sun size={16} />}
      {theme === "day" ? "Night mode" : "Day mode"}
    </button>
  );
}
