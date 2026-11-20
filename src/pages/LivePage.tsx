import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LiveCall from "../components/LiveCall";
import Loader from "../components/Loader";
import { geminiToolsAvailable } from "../lib/geminiTools";
import { liveSupported } from "../lib/liveSession";

/** Página de "IA Live": abre directamente el selector de llamada (charla, situación o sorpresa). */
export default function LivePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  // Si el navegador no soporta Live, se sabe al iniciar: no hace falta esperar al servidor.
  const [ready, setReady] = useState<boolean | null>(() => (liveSupported() ? null : false));

  useEffect(() => {
    if (!profile || ready !== null) return;
    let cancelled = false;
    void geminiToolsAvailable().then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, ready]);

  if (!profile) return null;
  if (ready === null) return <Loader />;

  if (!ready) {
    return (
      <div className="mx-auto max-w-md py-16 text-center animate-fade-up">
        <p className="eyebrow mb-2">Live · beta</p>
        <h1 className="page-title mb-3">Not available here</h1>
        <p className="text-paper-muted">
          IA Live needs a browser with microphone support and the live service turned on. Try Chat in the meantime.
        </p>
        <button onClick={() => navigate("/speak")} className="btn-ghost mt-6">Back to Speak</button>
      </div>
    );
  }

  return (
    <LiveCall
      userId={profile.id}
      level={profile.current_level ?? "A2"}
      name={profile.name ?? ""}
      topic={null}
      onClose={() => navigate("/speak")}
    />
  );
}
