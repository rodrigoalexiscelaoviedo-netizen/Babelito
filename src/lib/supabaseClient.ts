import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // No tiramos error fatal para no romper el render, pero avisamos fuerte.
  console.error(
    "[Babelito] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. " +
      "Copiá .env.local.example a .env.local y completá los valores."
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
