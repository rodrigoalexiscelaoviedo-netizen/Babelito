import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LiveCall from "../components/LiveCall";
import Loader from "../components/Loader";
import { geminiToolsAvailable } from "../lib/geminiTools";
import { liveSupported } from "../lib/liveSession";
import { tFor } from "../i18n";

/** Página de "IA Live": abre directamente el selector de llamada (charla, situación o sorpresa). */
export default function LivePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const lang: "en" | "ca" = profile?.learning_language === "ca" ? "ca" : "en";
  const t = tFor(lang);
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
        <p className="eyebrow mb-2">{t("live.beta")}</p>
        <h1 className="page-title mb-3">{t("live.notAvailTitle")}</h1>
        <p className="text-paper-muted">{t("live.notAvailText")}</p>
        <button onClick={() => navigate("/speak")} className="btn-ghost mt-6">{t("live.backSpeak")}</button>
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
      lang={lang}
    />
  );
}
