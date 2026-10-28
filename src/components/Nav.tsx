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
  BookMarked,
  Mic,
  Layers,
  Headphones,
  MoreHorizontal,
  Target,
  Keyboard,
  GraduationCap,
  TrendingDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { countDue } from "../lib/srs";
import { warmNaturalVoice } from "../lib/naturalVoice";
import i18n, { uiLang } from "../i18n";

type NavKey =
  | "home" | "talk" | "chunks" | "correct" | "roleplay" | "reading" | "stories"
  | "sounds" | "review" | "listening" | "progress" | "profile" | "words" | "situations" | "dictation" | "grammar" | "mistakes";

interface NavItem {
  to: string;
  key: NavKey;
  icon: LucideIcon;
  end?: boolean;
}

const ITEMS: Record<string, NavItem> = {
  "/": { to: "/", key: "home", icon: LayoutDashboard, end: true },
  "/situations": { to: "/situations", key: "situations", icon: Target },
  "/conversation": { to: "/conversation", key: "talk", icon: MessageCircle },
  "/roleplay": { to: "/roleplay", key: "roleplay", icon: Drama },
  "/correct": { to: "/correct", key: "correct", icon: PencilLine },
  "/sounds": { to: "/sounds", key: "sounds", icon: Mic },
  "/listening": { to: "/listening", key: "listening", icon: Headphones },
  "/dictation": { to: "/dictation", key: "dictation", icon: Keyboard },
  "/stories": { to: "/stories", key: "stories", icon: BookText },
  "/reading": { to: "/reading", key: "reading", icon: BookOpen },
  "/review": { to: "/review", key: "review", icon: Layers },
  "/chunks": { to: "/chunks", key: "chunks", icon: Library },
  "/words": { to: "/words", key: "words", icon: BookMarked },
  "/mistakes": { to: "/mistakes", key: "mistakes", icon: TrendingDown },
  "/grammar": { to: "/grammar", key: "grammar", icon: GraduationCap },
  "/progress": { to: "/progress", key: "progress", icon: BarChart3 },
  "/profile": { to: "/profile", key: "profile", icon: User },
};

/**
 * Menú agrupado por lo que se practica. Antes era una lista plana de 12 ítems
 * sin orden; ahora cada grupo responde a una habilidad (hablar, escuchar,
 * leer, recordar) y el celular muestra primero lo que se usa a diario.
 */
const GROUPS: Array<{ labelKey: string | null; routes: string[] }> = [
  { labelKey: null, routes: ["/"] },
  { labelKey: "groupSpeak", routes: ["/situations", "/conversation", "/roleplay", "/correct"] },
  { labelKey: "groupSounds", routes: ["/sounds", "/listening", "/dictation"] },
  { labelKey: "groupRead", routes: ["/stories", "/reading"] },
  { labelKey: "groupRemember", routes: ["/review", "/chunks", "/words", "/mistakes", "/grammar"] },
  { labelKey: "groupYou", routes: ["/progress", "/profile"] },
];

// Barra inferior móvil: lo de uso diario. El resto, en "Más", con los mismos grupos.
const BOTTOM_FIXED = ["/", "/conversation", "/review", "/stories"];

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

  // Averigua una vez si el servidor ofrece voz natural (Azure) para el inglés.
  useEffect(() => {
    if (profile && profile.learning_language !== "ca") void warmNaturalVoice();
  }, [profile]);

  // Cierra la hoja al navegar
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const isActive = (item: NavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  // Situaciones aún no existe en catalán (se replica cuando cierre la versión inglesa).
  const hidden = new Set<string>(profile?.learning_language === "ca" ? ["/situations", "/dictation", "/grammar", "/mistakes"] : []);
  const moreRoutes = Object.keys(ITEMS).filter((r) => !BOTTOM_FIXED.includes(r) && !hidden.has(r));
  const moreIsActive = moreRoutes.some((r) => isActive(ITEMS[r]));

  const badge = (to: string, small = false) =>
    to === "/review" && reviewCount > 0 ? (
      <span
        className={`ml-auto rounded-full bg-gold font-bold leading-none text-ink-900 ${
          small ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
        }`}
        aria-label={`${reviewCount} due`}
      >
        {reviewCount}
      </span>
    ) : null;

  return (
    <>
      {/* ── Sidebar desktop ──────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:overflow-y-auto md:border-r md:border-ink-600 md:bg-ink-800 md:px-4 md:py-6">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-ink-900 font-display font-extrabold">
            B
          </div>
          <span className="font-display text-xl font-bold tracking-tight">{t("nav.brand")}</span>
        </div>

        <nav className="flex flex-col gap-4" aria-label="Main">
          {GROUPS.map((group) => (
            <div key={group.labelKey ?? "top"}>
              {group.labelKey && (
                <p className="mb-1 px-3 font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                  {t(`nav.${group.labelKey}`)}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.routes.filter((r) => !hidden.has(r)).map((route) => {
                  const item = ITEMS[route];
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive: active }) =>
                        `relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-ink-600 text-paper before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-coral"
                            : "text-paper-muted hover:bg-ink-700 hover:text-paper"
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span className="flex-1">{t(`nav.${item.key}`)}</span>
                      {badge(item.to)}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Barra inferior móvil ─────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-600 bg-ink-800/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <div className="flex h-14">
          {BOTTOM_FIXED.map((route) => {
            const item = ITEMS[route];
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive: active }) =>
                  `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                    active ? "text-coral" : "text-paper-muted"
                  }`
                }
              >
                <div className="relative">
                  <Icon size={20} />
                  {item.to === "/review" && reviewCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-0.5 text-[8px] font-bold leading-none text-ink-900">
                      {reviewCount > 9 ? "9+" : reviewCount}
                    </span>
                  )}
                </div>
                {t(`nav.${item.key}`)}
              </NavLink>
            );
          })}

          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
              moreIsActive || moreOpen ? "text-coral" : "text-paper-muted"
            }`}
            aria-label={t("nav.moreModules")}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={20} />
            {t("nav.more")}
          </button>
        </div>
      </nav>

      {/* ── Hoja "Más" ───────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-ink-900/70" onClick={() => setMoreOpen(false)} />

          <div
            className="md:hidden fixed bottom-14 inset-x-0 z-50 bg-ink-800 border-t border-ink-600 rounded-t-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: "70vh", paddingBottom: "env(safe-area-inset-bottom)" }}
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
              {GROUPS.map((group) => {
                const routes = group.routes.filter((r) => moreRoutes.includes(r));
                if (routes.length === 0 || !group.labelKey) return null;
                return (
                  <div key={group.labelKey}>
                    <p className="text-[10px] uppercase tracking-widest text-paper-faint font-mono mb-2 px-1">
                      {t(`nav.${group.labelKey}`)}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {routes.map((route) => {
                        const item = ITEMS[route];
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMoreOpen(false)}
                            className={({ isActive: active }) =>
                              `flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition ${
                                active
                                  ? "bg-ink-600 text-coral"
                                  : "bg-ink-700 text-paper-muted hover:text-paper hover:bg-ink-600"
                              }`
                            }
                          >
                            <Icon size={17} className="shrink-0" />
                            {t(`nav.${item.key}`)}
                            {badge(item.to, true)}
                          </NavLink>
                        );
                      })}
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
