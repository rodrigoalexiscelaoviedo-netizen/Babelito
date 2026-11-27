import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { HUB_ICONS } from "../components/hubIcons";
import { hubById, visibleItems, type HubId } from "../lib/hubs";

type VisibleItem = ReturnType<typeof visibleItems>[number];
import { countDue, deckSize } from "../lib/srs";
import { supabase } from "../lib/supabaseClient";
import { scopeByLanguage } from "../lib/language";
import { geminiToolsAvailable } from "../lib/geminiTools";
import { liveSupported } from "../lib/liveSession";
import { tFor } from "../i18n";
import { useCountUp } from "../lib/useCountUp";

function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value, 700)}</>;
}

/** Cada puerta tiene su color (token de index.css): se reconoce dónde estás de un vistazo. */
const ACCENT: Record<HubId, { token: string; text: string }> = {
  speak: { token: "coral", text: "text-coral" },
  learn: { token: "sky", text: "text-sky" },
  remember: { token: "mint", text: "text-mint" },
  me: { token: "gold", text: "text-ongold" },
};

/** Estilo de la puerta: el color llega a la tarjeta por una variable CSS. */
function accentStyle(token: string): CSSProperties {
  return { ["--accent-rgb" as string]: `var(--${token})` } as CSSProperties;
}

/**
 * Página de una puerta: la herramienta principal grande ("empezá por acá") y el
 * resto como tarjetas. Una sola decisión a la vez.
 */
export default function Hub({ id }: { id: HubId }) {
  const { profile } = useAuth();
  const hub = hubById(id);
  const language = profile?.learning_language || "en";
  const ca = language === "ca";
  const t = tFor(language);
  const [due, setDue] = useState(0);
  const [stats, setStats] = useState<{ deck: number; learning: number; known: number } | null>(null);
  const [liveOk, setLiveOk] = useState(false);

  useEffect(() => {
    if (!profile || id !== "remember") return;
    let cancelled = false;
    const count = (status: string) =>
      scopeByLanguage(
        supabase.from("user_vocabulary").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", status),
        language
      ).then((r: { count: number | null }) => r.count ?? 0);
    void Promise.all([countDue(profile.id, language), deckSize(profile.id, language), count("learning"), count("known")])
      .then(([d, deck, learning, known]) => {
        if (cancelled) return;
        setDue(d);
        setStats({ deck, learning, known });
      })
      .catch(() => {
        /* sin números: la pantalla funciona igual */
      });
    return () => {
      cancelled = true;
    };
  }, [profile, id, language]);

  // IA Live solo aparece si el navegador la soporta y el servidor la tiene.
  useEffect(() => {
    if (id !== "speak" || !liveSupported()) return;
    let cancelled = false;
    void geminiToolsAvailable().then((ok) => {
      if (!cancelled) setLiveOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const items = visibleItems(hub, language).filter((i) => !i.requiresLive || liveOk);
  const featured = items.find((i) => i.featured) ?? items[0];
  const rest = items.filter((i) => i !== featured);
  const copy = ca ? hub.ca : hub.en;
  const FeaturedIcon = featured ? HUB_ICONS[featured.icon] : null;
  const accent = ACCENT[id];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title mb-1">{copy.title}</h1>
      <p className="mb-6 text-paper-muted">{copy.subtitle}</p>

      {id === "remember" && (
        <>
          <p className="mb-4 text-sm text-paper-muted">{t("hub.rememberIntro")}</p>
          {stats && (
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { n: due, label: t("hub.dueToday"), tone: due > 0 ? "text-gold" : "text-mint" },
                { n: stats.learning, label: t("hub.wordsPractice"), tone: "text-coral" },
                { n: stats.known, label: t("hub.wordsKnown"), tone: "text-mint" },
              ].map((x) => (
                <div key={x.label} className="card p-3 text-center">
                  <p className={`font-display text-2xl font-extrabold tabular-nums ${x.tone}`}>
                    <CountUp value={x.n} />
                  </p>
                  <p className="text-[11px] leading-tight text-paper-muted">{x.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {featured && FeaturedIcon && (
        <Link
          to={featured.to}
          className="hero-block group mb-6 block transition-transform duration-200 ease-out-expo active:scale-[0.98]"
          style={{ ["--hero-rgb" as string]: `var(--${accent.token})` } as CSSProperties}
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <span className="hero-shape absolute -right-16 -top-20 h-64 w-64 rounded-full" />
            <span className="hero-shape hero-shape-2 absolute -bottom-24 right-10 h-48 w-48 rounded-[3rem]" />
            <FeaturedIcon size={180} strokeWidth={1.25} className="absolute -bottom-8 -right-6 rotate-[-12deg] opacity-15" />
          </span>
          <span className="hero-eyebrow block">{t("hub.startHere")}</span>
          <span className="hero-title block">{featured.text.title}</span>
          <span className="mt-2 block max-w-sm text-sm font-medium opacity-85">{featured.text.desc}</span>
          <span className="mt-6 flex items-center gap-3">
            <span className="hero-cta">
              <FeaturedIcon size={18} aria-hidden /> {t("hub.open")}
              <ArrowRight size={18} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" aria-hidden />
            </span>
            {featured.dueBadge && due > 0 && (
              <span className="rounded-full bg-ink-900/90 px-3 py-1.5 text-sm font-bold text-gold" aria-label={t("hub.dueAria", { n: due })}>
                {due}
              </span>
            )}
          </span>
        </Link>
      )}

      <div className="hub-grid grid gap-3 sm:grid-cols-2 stagger">
        {rest.map((item) => (
          <HubCard key={item.to} item={item} token={accent.token} />
        ))}
      </div>
    </div>
  );
}

function HubCard({ item, token }: { item: VisibleItem; token: string }) {
  const Icon = HUB_ICONS[item.icon];
  return (
    <Link to={item.to} className="hub-card group flex items-center gap-4 p-4" style={accentStyle(token)}>
      <span className="hub-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb)/0.14)] text-[rgb(var(--accent-rgb))]">
        {Icon && <Icon size={22} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-lg font-bold leading-snug">{item.text.title}</span>
          {item.badge && (
            <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ongold">{item.badge}</span>
          )}
          {item.requiresLive && (
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-paper-muted">{item.text.desc}</span>
      </span>
      <ArrowRight size={18} className="hub-arrow shrink-0 text-paper-faint" aria-hidden />
    </Link>
  );
}
