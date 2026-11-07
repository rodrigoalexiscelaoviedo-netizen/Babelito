import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { HUB_ICONS } from "../components/hubIcons";
import { hubById, visibleItems, type HubId } from "../lib/hubs";
import { countDue, deckSize } from "../lib/srs";
import { supabase } from "../lib/supabaseClient";
import { scopeByLanguage } from "../lib/language";

/**
 * Página de una puerta: la herramienta principal grande ("empezá por acá") y el
 * resto como tarjetas simples. Una sola decisión a la vez.
 */
export default function Hub({ id }: { id: HubId }) {
  const { profile } = useAuth();
  const hub = hubById(id);
  const language = profile?.learning_language || "en";
  const ca = language === "ca";
  const [due, setDue] = useState(0);
  const [stats, setStats] = useState<{ deck: number; learning: number; known: number } | null>(null);

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

  const items = visibleItems(hub, language);
  const featured = items.find((i) => i.featured) ?? items[0];
  const rest = items.filter((i) => i !== featured);
  const copy = ca ? hub.ca : hub.en;
  const FeaturedIcon = featured ? HUB_ICONS[featured.icon] : null;

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
        <Link
          to={featured.to}
          className="card-interactive group mb-5 flex items-center gap-4 border-coral/30 bg-gradient-to-br from-ink-700 to-ink-800 p-6"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-coral text-ink-900">
            <FeaturedIcon size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-widest text-coral">{ca ? "Comença aquí" : "Start here"}</span>
            <span className="block font-display text-xl font-bold">{featured.text.title}</span>
            <span className="block text-sm text-paper-muted">{featured.text.desc}</span>
          </span>
          {featured.dueBadge && due > 0 && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ongold" aria-label={`${due} due`}>
              {due}
            </span>
          )}
          <ArrowRight className="shrink-0 text-coral transition group-hover:translate-x-1" size={20} />
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 stagger">
        {rest.map((item) => {
          const Icon = HUB_ICONS[item.icon];
          return (
            <Link key={item.to} to={item.to} className="card-interactive flex items-start gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-700 text-coral">{Icon && <Icon size={18} />}</span>
              <span className="min-w-0">
                <span className="block font-medium">{item.text.title}</span>
                <span className="block text-xs text-paper-muted">{item.text.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
