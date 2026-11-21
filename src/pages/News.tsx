import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { BrandDots } from "../components/Loader";
import { loadNews, type NewsItem } from "../lib/news";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function News() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadNews()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="animate-fade-up max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/learn")}
        className="flex items-center gap-2 text-sm text-paper-muted hover:text-paper transition mb-6"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>

      <p className="eyebrow mb-2">News</p>
      <h1 className="page-title mb-2">What's new in AI</h1>
      <p className="text-paper-muted mb-8">
        Recent release notes from the tools you use, summarised. Open the source to read the full note.
      </p>

      {items === null && !error && (
        <div className="flex justify-center py-16" role="status" aria-label="Loading news">
          <BrandDots />
        </div>
      )}

      {error && (
        <div className="card p-5 text-center">
          <p className="font-medium mb-1">Couldn't load the news right now.</p>
          <p className="text-sm text-paper-muted mb-4">Check your connection and try again.</p>
          <button className="btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2" onClick={() => {
              setError(false);
              setItems(null);
              setReloadKey((k) => k + 1);
            }}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {items && items.length === 0 && (
        <p className="text-paper-muted text-center py-12">No news right now. Come back later.</p>
      )}

      {items && items.length > 0 && (
        <ul className="grid gap-4 stagger">
          {items.map((n) => (
            <li key={n.id} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-paper-faint">{n.source}</span>
                <time dateTime={n.published} className="text-xs text-paper-muted">{formatDate(n.published)}</time>
              </div>
              <h2 className="font-display text-lg font-bold leading-snug">{n.title}</h2>
              {n.summary && <p className="text-sm text-paper-muted mt-2 leading-relaxed">{n.summary}</p>}
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-coral hover:text-coral-soft transition"
              >
                Read on the source <ExternalLink size={13} aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
