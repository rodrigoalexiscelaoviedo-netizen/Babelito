import { supabase } from "./supabaseClient";

/** Titular de IA: resumen corto y enlace al original (nunca el texto completo). */
export interface NewsItem {
  id: string;
  title: string;
  link: string;
  published: string;
  source: string;
  summary: string;
}

/** Trae los titulares de la función news-feed (lista cerrada de feeds en el servidor). */
export async function loadNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase.functions.invoke<{ items: NewsItem[] }>("news-feed");
  if (error) throw error;
  return data?.items ?? [];
}
