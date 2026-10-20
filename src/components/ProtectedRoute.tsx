import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/**
 * Gatea el acceso. Si no hay sesión → login. Si falta onboarding o
 * diagnóstico, empuja al usuario al paso que corresponde (salvo que
 * ya esté en esa ruta, controlado por `allowIncomplete`).
 */
export default function ProtectedRoute({
  children,
  allowIncomplete = false,
}: {
  children: JSX.Element;
  allowIncomplete?: boolean;
}) {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();

  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    // Antes: loader infinito. Ahora: mensaje claro con reintento.
    if (profileError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-paper-muted">No pudimos cargar tu perfil.</p>
          <button className="btn-coral" onClick={() => refreshProfile()}>
            Reintentar
          </button>
        </div>
      );
    }
    return <Loader label="Preparing your space…" />;
  }

  if (!allowIncomplete) {
    if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
    if (!profile.diagnostic_complete) return <Navigate to="/diagnostic" replace />;
  }

  return children;
}
