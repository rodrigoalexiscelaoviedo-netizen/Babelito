import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
  Mic,
  Layers,
  Headphones,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { countDue } from "../lib/srs";

const LINKS = [
  { to: "/",             label: "Home",      icon: LayoutDashboard, end: true  },
  { to: "/conversation", label: "Talk",       icon: MessageCircle               },
  { to: "/chunks",       label: "Chunks",     icon: Library                     },
  { to: "/correct",      label: "Correct",    icon: PencilLine                  },
  { to: "/roleplay",     label: "Roleplay",   icon: Drama                       },
  { to: "/reading",      label: "Reading",    icon: BookOpen                    },
  { to: "/stories",      label: "Stories",    icon: BookText                    },
  { to: "/sounds",       label: "Sounds",     icon: Mic                         },
  { to: "/review",       label: "Review",     icon: Layers                      },
  { to: "/listening",    label: "Listening",  icon: Headphones                  },
  { to: "/progress",     label: "Progress",   icon: BarChart3                   },
  { to: "/profile",      label: "Profile",    icon: User                        },
];

// Mobile bottom nav: 4 fixed tabs + "Más" overflow button
const BOTTOM_FIXED = ["/", "/conversation", "/sounds", "/progress"];
const BOTTOM_LINKS = LINKS.filter((l) => BOTTOM_FIXED.includes(l.to));
const MORE_LINKS   = LINKS.filter((l) => !BOTTOM_FIXED.includes(l.to));

const MORE_GROUPS = [
  { label: "Práctica",  routes: ["/roleplay", "/review", "/listening"] },
  { label: "Contenido", routes: ["/chunks", "/reading", "/stories", "/correct"] },
  { label: "Cuenta",    routes: ["/profile"] },
];

export default function Nav() {
  const { profile }  = useAuth();
  const location     = useLocation();
  const [reviewCount, setReviewCount] = useState(0);
  const [moreOpen,    setMoreOpen]    = useState(false);

  useEffect(() => {
    if (!profile) return;
    countDue(profile.id).then(setReviewCount);
  }, [profile]);

  // Close sheet when the user navigates
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const moreIsActive = MORE_LINKS.some((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  return (
    <>
      {/* ── Sidebar desktop (unchanged) ──────────────────────────────── */}
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
              <span className="flex-1">{label}</span>
              {to === "/review" && reviewCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-gold text-ink-900 rounded-full px-1.5 py-0.5 leading-none">
                  {reviewCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Bottom nav mobile — 4 fixed + "Más" ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-600 bg-ink-800/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14">
          {BOTTOM_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                  isActive ? "text-coral" : "text-paper-muted"
                }`
              }
            >
              <div className="relative">
                <Icon size={20} />
                {to === "/review" && reviewCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-gold text-ink-900 rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {reviewCount > 9 ? "9+" : reviewCount}
                  </span>
                )}
              </div>
              {label}
            </NavLink>
          ))}

          {/* "Más" overflow button */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
              moreIsActive || moreOpen ? "text-coral" : "text-paper-muted"
            }`}
            aria-label="Más módulos"
          >
            <MoreHorizontal size={20} />
            Más
          </button>
        </div>
      </nav>

      {/* ── "Más" bottom sheet ───────────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-900/70"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="md:hidden fixed bottom-14 inset-x-0 z-50 bg-ink-800 border-t border-ink-600 rounded-t-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: "65vh", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Handle + header */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-ink-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
              <p className="font-display font-bold text-sm">Más módulos</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-paper-muted hover:text-paper transition p-1"
                aria-label="Cerrar"
              >
                <X size={17} />
              </button>
            </div>

            {/* Groups */}
            <div className="p-4 space-y-5">
              {MORE_GROUPS.map((group) => {
                const groupLinks = MORE_LINKS.filter((l) => group.routes.includes(l.to));
                if (groupLinks.length === 0) return null;
                return (
                  <div key={group.label}>
                    <p className="text-[10px] uppercase tracking-widest text-paper-faint font-mono mb-2 px-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupLinks.map(({ to, label, icon: Icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMoreOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition ${
                              isActive
                                ? "bg-ink-600 text-coral"
                                : "bg-ink-700 text-paper-muted hover:text-paper hover:bg-ink-600"
                            }`
                          }
                        >
                          <Icon size={17} className="shrink-0" />
                          {label}
                          {to === "/review" && reviewCount > 0 && (
                            <span className="ml-auto text-[9px] font-bold bg-gold text-ink-900 rounded-full px-1 py-0.5 leading-none">
                              {reviewCount}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
