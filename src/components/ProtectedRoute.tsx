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
  const { session, profile, loading } = useAuth();

  if (loading) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;

  // Mientras el trigger crea el profile puede tardar un instante.
  if (!profile) return <Loader label="Preparing your space…" />;

  if (!allowIncomplete) {
    if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
    if (!profile.diagnostic_complete) return <Navigate to="/diagnostic" replace />;
  }

  return children;
}
