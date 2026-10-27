import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import i18n, { uiLang } from "../i18n";

type NavKey =
  | "home" | "talk" | "chunks" | "correct" | "roleplay" | "reading"
  | "stories" | "sounds" | "review" | "listening" | "progress" | "profile";

const LINKS = [
  { to: "/",             key: "home",      icon: LayoutDashboard, end: true },
  { to: "/conversation", key: "talk",      icon: MessageCircle },
  { to: "/chunks",       key: "chunks",    icon: Library },
  { to: "/correct",      key: "correct",   icon: PencilLine },
  { to: "/roleplay",     key: "roleplay",  icon: Drama },
  { to: "/reading",      key: "reading",   icon: BookOpen },
  { to: "/stories",      key: "stories",   icon: BookText },
  { to: "/sounds",       key: "sounds",    icon: Mic },
  { to: "/review",       key: "review",    icon: Layers },
  { to: "/listening",    key: "listening", icon: Headphones },
  { to: "/progress",     key: "progress",  icon: BarChart3 },
  { to: "/profile",      key: "profile",   icon: User },
] as const satisfies ReadonlyArray<{ to: string; key: NavKey; icon: unknown; end?: boolean }>;

// Barra inferior móvil: 4 pestañas fijas + "Más"
const BOTTOM_FIXED = ["/", "/conversation", "/sounds", "/progress"];
const BOTTOM_LINKS = LINKS.filter((l) => BOTTOM_FIXED.includes(l.to));
const MORE_LINKS = LINKS.filter((l) => !BOTTOM_FIXED.includes(l.to));

const MORE_GROUPS = [
  { groupKey: "groupPractice", routes: ["/roleplay", "/review", "/listening"] },
  { groupKey: "groupContent", routes: ["/chunks", "/reading", "/stories", "/correct"] },
  { groupKey: "groupAccount", routes: ["/profile"] },
] as const;

export default function Nav() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [reviewCount, setReviewCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  // La interfaz sigue al idioma que se aprende (ver src/i18n/index.ts).
  useEffect(() => {
    void i18n.changeLanguage(uiLang(profile?.learning_language));
  }, [profile?.learning_language]);

  useEffect(() => {
    if (!profile) return;
    countDue(profile.id, profile.learning_language || "en").then(setReviewCount);
  }, [profile]);

  // Cierra la hoja al navegar
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const moreIsActive = MORE_LINKS.some((l) =>
    "end" in l && l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  return (
    <>
      {/* ── Sidebar desktop ──────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-ink-600 md:bg-ink-800 md:px-4 md:py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-ink-900 font-display font-extrabold">
            B
          </div>
          <span className="font-display text-xl font-bold tracking-tight">{t("nav.brand")}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map(({ to, key, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest ? rest.end : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-ink-600 text-paper before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-coral"
                    : "text-paper-muted hover:bg-ink-700 hover:text-paper"
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{t(`nav.${key}`)}</span>
              {to === "/review" && reviewCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-gold text-ink-900 rounded-full px-1.5 py-0.5 leading-none">
                  {reviewCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Barra inferior móvil: 4 fijas + "Más" ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-600 bg-ink-800/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14">
          {BOTTOM_LINKS.map(({ to, key, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest ? rest.end : undefined}
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
              {t(`nav.${key}`)}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
              moreIsActive || moreOpen ? "text-coral" : "text-paper-muted"
            }`}
            aria-label={t("nav.moreModules")}
          >
            <MoreHorizontal size={20} />
            {t("nav.more")}
          </button>
        </div>
      </nav>

      {/* ── Hoja "Más" ───────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-900/70"
            onClick={() => setMoreOpen(false)}
          />

          <div
            className="md:hidden fixed bottom-14 inset-x-0 z-50 bg-ink-800 border-t border-ink-600 rounded-t-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: "65vh", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-ink-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-ink-700">
              <p className="font-display font-bold text-sm">{t("nav.moreModules")}</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-paper-muted hover:text-paper transition p-1"
                aria-label={t("nav.close")}
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {MORE_GROUPS.map((group) => {
                const groupLinks = MORE_LINKS.filter((l) => (group.routes as readonly string[]).includes(l.to));
                if (groupLinks.length === 0) return null;
                return (
                  <div key={group.groupKey}>
                    <p className="text-[10px] uppercase tracking-widest text-paper-faint font-mono mb-2 px-1">
                      {t(`nav.${group.groupKey}`)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupLinks.map(({ to, key, icon: Icon }) => (
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
                          {t(`nav.${key}`)}
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
