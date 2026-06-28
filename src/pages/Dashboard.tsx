import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Library, PencilLine, Drama, BarChart3, Flame, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel } from "../lib/errorTypes";

interface Stats {
  sessions: number;
  streak: number;
  topError: string | null;
  chunksLearned: number;
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // permite que la racha cuente si practicó hoy o ayer
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: sessions }, { data: errs }, { count: learned }] = await Promise.all([
        supabase.from("sessions").select("created_at").eq("user_id", profile.id),
        supabase.from("errors").select("error_type").eq("user_id", profile.id),
        supabase
          .from("user_chunks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id),
      ]);

      // error más frecuente
      let topError: string | null = null;
      if (errs && errs.length) {
        const tally: Record<string, number> = {};
        errs.forEach((e) => (tally[e.error_type] = (tally[e.error_type] ?? 0) + 1));
        topError = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
      }

      setStats({
        sessions: sessions?.length ?? 0,
        streak: computeStreak((sessions ?? []).map((s) => s.created_at)),
        topError,
        chunksLearned: learned ?? 0,
      });
    })();
  }, [profile]);

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening";

  const modules = [
    { to: "/conversation", label: "Talk to your coach", desc: "Live conversation with feedback", icon: MessageCircle, accent: "coral" },
    { to: "/roleplay", label: "Roleplay a scene", desc: "Interviews, calls, meetings", icon: Drama, accent: "mint" },
    { to: "/chunks", label: "Chunks library", desc: "Ready-made expressions", icon: Library, accent: "gold" },
    { to: "/correct", label: "Fix my writing", desc: "Paste an email or message", icon: PencilLine, accent: "coral" },
  ];

  return (
    <div className="animate-fade-up">
      <header className="mb-8">
        <p className="eyebrow mb-2">{greeting}</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold">
          {greeting}, {firstName}.
        </h1>
        <p className="text-paper-muted mt-1">Ready for a few minutes of English?</p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Flame size={15} className="text-coral" />
            <span className="text-xs">Streak</span>
          </div>
          <p className="font-display text-2xl font-bold">
            {stats?.streak ?? 0} <span className="text-sm font-normal text-paper-muted">days</span>
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Target size={15} className="text-mint" />
            <span className="text-xs">Level</span>
          </div>
          <p className="font-display text-2xl font-bold">{profile?.current_level ?? "—"}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <MessageCircle size={15} className="text-gold" />
            <span className="text-xs">Sessions</span>
          </div>
          <p className="font-display text-2xl font-bold">{stats?.sessions ?? 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-paper-muted mb-1">
            <Library size={15} className="text-mint" />
            <span className="text-xs">Chunks</span>
          </div>
          <p className="font-display text-2xl font-bold">{stats?.chunksLearned ?? 0}</p>
        </div>
      </div>

      {/* Coach nudge basado en historial */}
      {stats?.topError && (
        <Link
          to="/conversation"
          className="card mb-8 flex items-center justify-between p-5 hover:border-coral/50 transition group"
        >
          <div>
            <p className="eyebrow mb-1 text-coral">Coach noticed</p>
            <p className="font-medium">
              You keep slipping on <strong>{errorLabel(stats.topError)}</strong>. Want to drill it
              in a quick chat?
            </p>
          </div>
          <span className="text-coral group-hover:translate-x-1 transition">→</span>
        </Link>
      )}

      {/* Módulos */}
      <div className="grid sm:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="card p-6 hover:border-ink-500 transition group relative overflow-hidden"
          >
            <m.icon
              size={28}
              className={
                m.accent === "coral" ? "text-coral" : m.accent === "mint" ? "text-mint" : "text-gold"
              }
            />
            <h3 className="font-display text-lg font-bold mt-4">{m.label}</h3>
            <p className="text-sm text-paper-muted mt-1">{m.desc}</p>
            <span className="absolute right-5 bottom-5 text-paper-faint group-hover:text-paper transition">
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link to="/progress" className="inline-flex items-center gap-2 text-sm text-paper-muted hover:text-paper">
          <BarChart3 size={15} /> See your full progress
        </Link>
      </div>
    </div>
  );
}
