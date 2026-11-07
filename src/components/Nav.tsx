import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { countDue } from "../lib/srs";
import { warmNaturalVoice } from "../lib/naturalVoice";
import i18n, { uiLang } from "../i18n";
import { HUBS, hubForPath, visibleItems, type HubId } from "../lib/hubs";
import { HUB_ICONS } from "./hubIcons";
import ThemeToggle from "./ThemeToggle";

/**
 * Menú de 5 puertas: Inicio, Hablar, Aprender, Recordar y Yo.
 * Escritorio: barra lateral con las herramientas de la puerta activa a la vista.
 * Móvil: barra inferior con las mismas 5 puertas.
 */
export default function Nav() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [reviewCount, setReviewCount] = useState(0);
  const language = profile?.learning_language || "en";
  const ca = language === "ca";

  // La interfaz sigue al idioma que se aprende (ver src/i18n/index.ts).
  useEffect(() => {
    void i18n.changeLanguage(uiLang(profile?.learning_language));
  }, [profile?.learning_language]);

  useEffect(() => {
    if (!profile) return;
    countDue(profile.id, profile.learning_language || "en").then(setReviewCount);
  }, [profile, location.pathname]);

  // Averigua una vez si el servidor ofrece voz natural (Azure) para el inglés.
  useEffect(() => {
    if (profile && profile.learning_language !== "ca") void warmNaturalVoice();
  }, [profile]);

  const activeHub = hubForPath(location.pathname);

  const dueBadge = (id: HubId, small = false) =>
    id === "remember" && reviewCount > 0 ? (
      <span
        className={`rounded-full bg-gold font-bold leading-none text-ongold ${small ? "absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center px-0.5 text-[8px]" : "px-1.5 py-0.5 text-[10px]"}`}
        aria-label={`${reviewCount} due`}
      >
        {small && reviewCount > 9 ? "9+" : reviewCount}
      </span>
    ) : null;

  const rowClass = (active: boolean) =>
    `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "bg-ink-600 text-paper before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-coral"
        : "text-paper-muted hover:bg-ink-700 hover:text-paper"
    }`;

  return (
    <>
      {/* ── Sidebar desktop ──────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:overflow-y-auto md:border-r md:border-ink-600 md:bg-ink-800 md:px-4 md:py-6">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral font-display font-extrabold text-ink-900">B</div>
          <span className="font-display text-xl font-bold tracking-tight">{t("nav.brand")}</span>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => rowClass(isActive)}>
            <LayoutDashboard size={18} />
            <span className="flex-1">{t("nav.home")}</span>
          </NavLink>

          {HUBS.map((hub) => {
            const Icon = HUB_ICONS[hub.icon];
            const active = activeHub?.id === hub.id;
            const items = visibleItems(hub, language);
            return (
              <div key={hub.id}>
                <Link to={hub.path} className={rowClass(active && location.pathname === hub.path)} aria-current={active ? "true" : undefined}>
                  {Icon && <Icon size={18} className={active ? "text-coral" : ""} />}
                  <span className="flex-1">{(ca ? hub.ca : hub.en).nav}</span>
                  {dueBadge(hub.id)}
                </Link>
                {active && (
                  <ul className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-ink-600 pl-3">
                    {items.map((item) => {
                      const on = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            className={`block rounded-lg px-2 py-1.5 text-[13px] transition ${on ? "bg-ink-700 font-medium text-coral" : "text-paper-muted hover:text-paper"}`}
                          >
                            {item.text.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto pt-4">
          <ThemeToggle className="w-full" />
        </div>
      </aside>

      {/* ── Barra inferior móvil ─────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-600 bg-ink-800/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="flex h-14">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${isActive ? "text-coral" : "text-paper-muted"}`
            }
          >
            <LayoutDashboard size={20} />
            {t("nav.home")}
          </NavLink>
          {HUBS.map((hub) => {
            const Icon = HUB_ICONS[hub.icon];
            const active = activeHub?.id === hub.id;
            return (
              <Link
                key={hub.id}
                to={hub.path}
                aria-current={active ? "true" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${active ? "text-coral" : "text-paper-muted"}`}
              >
                <div className="relative">
                  {Icon && <Icon size={20} />}
                  {dueBadge(hub.id, true)}
                </div>
                {(ca ? hub.ca : hub.en).nav}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
