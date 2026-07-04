import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { errorLabel, errorHint } from "../lib/errorTypes";
import Loader from "../components/Loader";

interface ErrRow { error_type: string }
interface SessRow { created_at: string; duration_seconds: number }
interface VocabRow { status: string }
interface StoryProgRow { completed: boolean }

export default function Progress() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errs, setErrs] = useState<ErrRow[]>([]);
  const [sessions, setSessions] = useState<SessRow[]>([]);
  const [vocab, setVocab] = useState<VocabRow[]>([]);
  const [storyProg, setStoryProg] = useState<StoryProgRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: e }, { data: s }, { data: v }, { data: sp }] = await Promise.all([
        supabase.from("errors").select("error_type").eq("user_id", profile.id),
        supabase.from("sessions").select("created_at, duration_seconds").eq("user_id", profile.id),
        supabase.from("user_vocabulary").select("status").eq("user_id", profile.id),
        supabase.from("story_progress").select("completed").eq("user_id", profile.id).eq("completed", true),
      ]);
      setErrs((e as ErrRow[]) ?? []);
      setSessions((s as SessRow[]) ?? []);
      setVocab((v as VocabRow[]) ?? []);
      setStoryProg((sp as StoryProgRow[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <Loader />;

  const tally: Record<string, number> = {};
  errs.forEach((e) => (tally[e.error_type] = (tally[e.error_type] ?? 0) + 1));
  const topErrors = Object.entries(tally)
    .map(([k, v]) => ({ type: k, label: errorLabel(k), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const days: { day: string; sessions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      day: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2),
      sessions: sessions.filter((s) => new Date(s.created_at).toDateString() === key).length,
    });
  }

  const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0) / 60);
  const vocabTotal = vocab.length;
  const vocabKnown = vocab.filter((v) => v.status === "known").length;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Your progress</p>
      <h1 className="font-display text-3xl font-extrabold mb-8">How you're doing</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Current level" value={profile?.current_level ?? "—"} />
        <Stat label="Sessions" value={String(sessions.length)} />
        <Stat label="Minutes" value={String(totalMinutes)} />
        <Stat label="Stories done" value={String(storyProg.length)} />
      </div>

      {/* Vocabulary card */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-1">Vocabulary</h3>
        <p className="text-sm text-paper-muted mb-4">Words you've tracked while reading.</p>
        {vocabTotal === 0 ? (
          <p className="text-paper-muted text-sm py-4 text-center">
            No words tracked yet. Try the Reading module and click on words to look them up.
          </p>
        ) : (
          <div className="flex items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold">{vocabTotal}</p>
              <p className="text-xs text-paper-muted mt-0.5">total words</p>
            </div>
            <div className="flex-1 h-3 bg-ink-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-mint rounded-full transition-all"
                style={{ width: vocabTotal > 0 ? `${Math.round((vocabKnown / vocabTotal) * 100)}%` : "0%" }}
              />
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-mint">{vocabKnown}</p>
              <p className="text-xs text-paper-muted mt-0.5">known</p>
            </div>
          </div>
        )}
      </div>

      {/* Actividad */}
      <div className="card p-5 mb-6">
        <h3 className="font-display font-bold mb-4">Last 14 days</h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={days}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B5E" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#FF6B5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222C44" vertical={false} />
            <XAxis dataKey="day" stroke="#5A6379" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#5A6379" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
            <Tooltip
              contentStyle={{ background: "#1A2236", border: "1px solid #2C3852", borderRadius: 12, color: "#EAEEF7" }}
            />
            <Area type="monotone" dataKey="sessions" stroke="#FF6B5E" strokeWidth={2} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top errores */}
      <div className="card p-5">
        <h3 className="font-display font-bold mb-1">What to work on</h3>
        <p className="text-sm text-paper-muted mb-4">Your most frequent mistakes — these feed your coach.</p>
        {topErrors.length === 0 ? (
          <p className="text-paper-muted text-sm py-6 text-center">
            No errors logged yet. Have a conversation and your coach will start mapping them here.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={topErrors.length * 46}>
              <BarChart data={topErrors} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#8A93A8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: "#222C44" }}
                  contentStyle={{ background: "#1A2236", border: "1px solid #2C3852", borderRadius: 12, color: "#EAEEF7" }}
                />
                <Bar dataKey="count" fill="#36C5A8" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {topErrors.slice(0, 3).map((e) => (
                <p key={e.type} className="text-sm text-paper-muted">
                  <strong className="text-paper">{e.label}:</strong> {errorHint(e.type)}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-paper-muted mb-1">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
