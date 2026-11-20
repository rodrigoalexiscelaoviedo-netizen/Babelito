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
    <div className="animate-fade-up mx-auto max-w-3xl">
      <h1 className="page-title mb-1">{copy.title}</h1>
      <p className="mb-6 text-paper-muted">{copy.subtitle}</p>

      {id === "remember" && !ca && (
        <>
          <p className="mb-4 text-sm text-paper-muted">
            Everything you save while you read, listen and talk lands here. Review it a few minutes a day and it stays in your head.
          </p>
          {stats && (
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { n: due, label: "due today", tone: due > 0 ? "text-gold" : "text-mint" },
                { n: stats.learning, label: "words in practice", tone: "text-coral" },
                { n: stats.known, label: "words you know", tone: "text-mint" },
              ].map((x) => (
                <div key={x.label} className="card p-3 text-center">
                  <p className={`font-display text-2xl font-extrabold ${x.tone}`}>{x.n}</p>
                  <p className="text-[11px] leading-tight text-paper-muted">{x.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {featured && FeaturedIcon && (
        <Link to={featured.to} className="hub-card hub-featured group mb-5 flex items-center gap-5 p-6" style={accentStyle(accent.token)}>
          <span className="relative grid h-16 w-16 shrink-0 place-items-center">
            <span className="absolute inset-0 rounded-2xl bg-[rgb(var(--accent-rgb))] opacity-30 motion-safe:animate-pulse-ring" aria-hidden />
            <span className="hub-icon relative grid h-16 w-16 place-items-center rounded-2xl bg-[rgb(var(--accent-rgb))] text-white shadow-[0_10px_30px_-10px_rgb(var(--accent-rgb)/0.7)]">
              <FeaturedIcon size={28} />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className={`mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] ${accent.text}`}>{ca ? "Comença aquí" : "Start here"}</span>
            <span className="block font-display text-2xl font-extrabold leading-tight">{featured.text.title}</span>
            <span className="mt-1 block text-sm text-paper-muted">{featured.text.desc}</span>
          </span>
          {featured.dueBadge && due > 0 && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ongold" aria-label={`${due} due`}>
              {due}
            </span>
          )}
          <span className="hub-arrow grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent-rgb)/0.12)] text-[rgb(var(--accent-rgb))]">
            <ArrowRight size={20} />
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
    <Link to={item.to} className="hub-card group flex flex-col gap-3 p-5" style={accentStyle(token)}>
      <div className="flex items-start justify-between gap-3">
        <span className="hub-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent-rgb)/0.14)] text-[rgb(var(--accent-rgb))]">
          {Icon && <Icon size={20} />}
        </span>
        <span className="flex items-center gap-2">
          {item.badge && (
            <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ongold">{item.badge}</span>
          )}
          {item.requiresLive && (
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
          )}
          <ArrowRight size={16} className="hub-arrow text-paper-faint" aria-hidden />
        </span>
      </div>
      <div className="min-w-0">
        <span className="block font-display text-lg font-bold leading-snug">{item.text.title}</span>
        <span className="mt-0.5 block text-sm text-paper-muted">{item.text.desc}</span>
      </div>
    </Link>
  );
}
