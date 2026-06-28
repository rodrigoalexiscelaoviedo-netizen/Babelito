import { useEffect, useRef, useState } from "react";
import { Send, Briefcase, Users, Phone, Wine, TrendingUp, Coffee, Drama } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { askCoach } from "../lib/claude";
import { buildRoleplayPrompt, parseErrors } from "../lib/buildSystemPrompt";
import { SCENARIOS, type Scenario } from "../lib/scenarios";
import type { ChatTurn } from "../lib/types";

const SCENARIO_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Users,
  Phone,
  Wine,
  TrendingUp,
  Coffee,
};

export default function Roleplay() {
  const { profile } = useAuth();
  const [scenario, setScenario] = useState<Scenario | null>(null);

  if (!scenario) {
    return (
      <div className="animate-fade-up">
        <p className="eyebrow mb-2">Roleplay</p>
        <h1 className="font-display text-3xl font-extrabold mb-2">Practise a real situation</h1>
        <p className="text-paper-muted mb-8">
          Your coach plays the other person. Type <span className="font-mono text-coral">/end</span>{" "}
          any time to get full feedback.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {SCENARIOS.map((s) => {
            const Icon = SCENARIO_ICONS[s.icon] ?? Drama;
            return (
              <button
                key={s.id}
                onClick={() => setScenario(s)}
                className="card p-5 text-left hover:border-coral/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <Icon size={24} className="text-coral" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                    {s.difficulty}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold mt-3">{s.title}</h3>
                <p className="text-sm text-paper-muted mt-1">{s.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <RoleplayChat scenario={scenario} onExit={() => setScenario(null)} key={scenario.id} />;
}

function RoleplayChat({ scenario, onExit }: { scenario: Scenario; onExit: () => void }) {
  const { profile } = useAuth();
  const [turns, setTurns] = useState<ChatTurn[]>([{ role: "assistant", content: scenario.opening }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef(profile ? buildRoleplayPrompt(profile, scenario) : "");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  async function send(text: string) {
    if (!text.trim() || !profile) return;
    const next = [...turns, { role: "user", content: text.trim() } as ChatTurn];
    setTurns(next);
    setInput("");
    setThinking(true);
    try {
      const raw = await askCoach({ system: systemRef.current, messages: next });
      const { clean, errorTypes } = parseErrors(raw);
      const updated = [...next, { role: "assistant", content: clean } as ChatTurn];
      setTurns(updated);

      let sid = sessionId;
      if (!sid) {
        const { data } = await supabase
          .from("sessions")
          .insert({ user_id: profile.id, session_type: "roleplay", topic: scenario.title })
          .select("id")
          .single();
        sid = data?.id ?? null;
        setSessionId(sid);
      }
      if (sid) {
        await supabase.from("sessions").update({ messages: updated, ended_at: new Date().toISOString() }).eq("id", sid);
        if (errorTypes.length)
          await supabase.from("errors").insert(
            errorTypes.map((t) => ({ user_id: profile.id, session_id: sid, error_type: t, original_text: text.trim() }))
          );
      }
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Error."}` }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="eyebrow">{scenario.title}</p>
          <p className="text-sm text-paper-muted">Playing: {scenario.coach_role}</p>
        </div>
        <button className="text-sm text-paper-muted hover:text-paper" onClick={onExit}>
          Leave
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl2 px-4 py-3 whitespace-pre-wrap leading-relaxed ${
                t.role === "user" ? "bg-coral text-ink-900" : "card"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="card px-4 py-3 text-paper-muted">…</div>
          </div>
        )}
      </div>

      <div className="pt-3">
        <div className="card flex items-end gap-2 p-2">
          <textarea
            className="flex-1 resize-none bg-transparent px-2 py-2 text-paper placeholder:text-paper-faint focus:outline-none max-h-32"
            rows={1}
            placeholder="Your line… (type /end for feedback)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="grid h-10 w-10 place-items-center rounded-xl bg-coral text-ink-900 hover:bg-coral-soft disabled:opacity-40 transition"
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
