import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        navigate("/onboarding", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/", { replace: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink-800 p-12">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-coral text-ink-900 font-display text-2xl font-extrabold">
            B
          </div>
          <span className="font-display text-2xl font-bold">Babelito</span>
        </div>
        <div>
          <p className="eyebrow mb-4">/ˈbæb.əl/ · your english coach</p>
          <h1 className="font-display text-5xl font-extrabold leading-tight">
            Talk every day.
            <br />
            <span className="text-coral">Sound like you mean it.</span>
          </h1>
          <p className="mt-6 max-w-md text-paper-muted">
            A coach that learns how <em>you</em> speak — your level, your mistakes, your goals —
            and adapts every single conversation around them.
          </p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-coral/70"
              style={{ height: `${12 + ((i * 37) % 40)}px` }}
            />
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral text-ink-900 font-display font-extrabold">
              B
            </div>
            <span className="font-display text-xl font-bold">Babelito</span>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-paper-muted mb-6">
            {mode === "signin" ? "Pick up where you left off." : "Two minutes and you're talking."}
          </p>

          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <input
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />

            {error && (
              <div className="rounded-xl border border-coral-deep/40 bg-coral-deep/10 px-4 py-3 text-sm text-coral-soft">
                {error}
              </div>
            )}

            <button className="btn-coral mt-1" onClick={submit} disabled={busy || !email || !password}>
              {busy ? "One sec…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-paper-muted">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="text-coral hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
