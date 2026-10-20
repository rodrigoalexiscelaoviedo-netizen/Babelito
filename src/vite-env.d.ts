/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Clave pública VAPID para Web Push (recordatorios). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** DSN de Sentry. Opcional: sin él no se reportan errores. */
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
