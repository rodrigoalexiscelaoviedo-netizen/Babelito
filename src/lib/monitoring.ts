import * as Sentry from "@sentry/react";

/**
 * Errores de producción. Sin VITE_SENTRY_DSN no hace nada (desarrollo y CI).
 * No se envía contenido de conversaciones: solo errores y trazas de navegación.
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `babelito@${import.meta.env.VITE_APP_VERSION ?? "dev"}`,
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
