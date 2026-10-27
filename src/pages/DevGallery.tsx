import { BookOpen, Drama, Library, MessageCircle, Sparkles } from "lucide-react";
import { BRAND } from "../lib/theme";
import { ActivityArea, HorizontalBars } from "../components/Charts";

/**
 * Galería visual SOLO para desarrollo (ruta /dev/ui, no existe en producción).
 * Sirve para revisar el sistema visual sin iniciar sesión.
 */
export default function DevGallery() {
  const days = Array.from({ length: 14 }, (_, i) => ({ day: `${i + 1}`, sessions: [0, 1, 2, 1, 3, 0, 2, 4, 1, 2, 3, 2, 5, 3][i] }));

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow mb-2">Design system</p>
        <h1 className="page-title mb-2">Babelito UI gallery</h1>
        <p className="page-sub">Every shared style in one place, without signing in.</p>
      </header>

      <section className="space-y-3">
        <p className="eyebrow">Buttons</p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-coral">Start talking →</button>
          <button className="btn-mint">Practice now</button>
          <button className="btn-ghost">Back</button>
          <button className="btn-coral" disabled>Disabled</button>
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow">Input</p>
        <input className="input max-w-md" placeholder="Type your answer here…" aria-label="Example input" />
      </section>

      <section className="space-y-3">
        <p className="eyebrow">Module cards (hover + stagger)</p>
        <div className="grid sm:grid-cols-2 gap-4 stagger">
          {[
            { label: "Talk to your coach", desc: "Live conversation with feedback", icon: MessageCircle, accent: "bg-coral", text: "text-coral" },
            { label: "Roleplay a scene", desc: "Interviews, calls, meetings", icon: Drama, accent: "bg-mint", text: "text-mint" },
            { label: "Chunks library", desc: "Ready-made expressions", icon: Library, accent: "bg-gold", text: "text-gold" },
            { label: "Stories", desc: "Read and answer questions", icon: BookOpen, accent: "bg-coral", text: "text-coral" },
          ].map((m) => (
            <a key={m.label} href="#" className="card-interactive p-6 group relative overflow-hidden">
              <span aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-30 ${m.accent}`} />
              <m.icon size={28} className={m.text} />
              <h3 className="font-display text-lg font-bold mt-4">{m.label}</h3>
              <p className="text-sm text-paper-muted mt-1">{m.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="eyebrow">XP card</p>
          <div className="card p-5 glow-gold">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="eyebrow mb-1">Level 4</p>
                <p className="font-display text-xl font-extrabold">Curious</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-extrabold text-gold">412</p>
                <p className="text-[11px] text-paper-faint uppercase tracking-widest font-mono">XP</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-ink-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-coral to-gold" style={{ width: "62%" }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-paper-muted">
              <span>63 XP to level 5</span>
              <span className="inline-flex items-center gap-1 text-mint"><Sparkles size={12} /> +38 today</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Loading skeleton</p>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-28" />
              </div>
              <div className="skeleton h-7 w-14" />
            </div>
            <div className="skeleton h-2.5 w-full rounded-full" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow">Level-up celebration</p>
        <div className="card relative overflow-hidden h-44 glow-gold">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-800/90">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="confetti-piece absolute top-0 h-2 w-1.5 rounded-sm"
                style={{ left: `${6 + i * 6.5}%`, background: [BRAND.coral, BRAND.mint, BRAND.gold][i % 3], animationDelay: `${(i % 5) * 0.12}s`, animationIterationCount: "infinite" }}
              />
            ))}
            <p className="eyebrow text-gold level-up-pop">Level up!</p>
            <p className="font-display text-3xl font-extrabold level-up-pop">Level 5</p>
            <p className="text-sm text-paper-muted mt-1">Explorer</p>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="eyebrow mb-3">Activity chart</p>
          <ActivityArea data={days} />
        </div>
        <div className="card p-5">
          <p className="eyebrow mb-3">Top errors</p>
          <HorizontalBars data={[{ label: "Missing 'to'", count: 7 }, { label: "Verb tense", count: 5 }, { label: "Articles", count: 3 }]} />
        </div>
      </section>

      <section className="space-y-3">
        <p className="eyebrow">Status colors</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="status-pending-bg rounded-full px-3 py-1">Pending</span>
          <span className="status-done-bg rounded-full px-3 py-1">Done</span>
          <span className="status-streak-bg rounded-full px-3 py-1">Streak 🔥</span>
        </div>
      </section>
    </div>
  );
}
