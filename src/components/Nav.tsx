import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  Library,
  PencilLine,
  Drama,
  BarChart3,
  User,
  BookOpen,
  BookText,
} from "lucide-react";

const LINKS = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/conversation", label: "Talk", icon: MessageCircle },
  { to: "/chunks", label: "Chunks", icon: Library },
  { to: "/correct", label: "Correct", icon: PencilLine },
  { to: "/roleplay", label: "Roleplay", icon: Drama },
  { to: "/reading", label: "Reading", icon: BookOpen },
  { to: "/stories", label: "Stories", icon: BookText },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Nav() {
  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-ink-600 md:bg-ink-800 md:px-4 md:py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-ink-900 font-display font-extrabold">
            B
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Babelito</span>
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-ink-600 text-paper"
                    : "text-paper-muted hover:bg-ink-700 hover:text-paper"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-600 bg-ink-800/95 backdrop-blur px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-between">
          {LINKS.filter((l) => l.label !== "Profile").map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  isActive ? "text-coral" : "text-paper-muted"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
