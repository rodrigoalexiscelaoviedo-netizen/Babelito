/**
 * Fechas en hora LOCAL del usuario, en formato YYYY-MM-DD.
 *
 * Nunca usar `toISOString().slice(0, 10)` para "el día de hoy": eso devuelve
 * la fecha UTC y, para un usuario en Barcelona, la práctica del día, la racha
 * y la notificación cambian a las 01:00–02:00 hora local en vez de a medianoche.
 */

export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convierte un timestamp (ISO, UTC de Postgres) a la fecha local del usuario. */
export function timestampToLocalDate(ts: string): string {
  return localDateISO(new Date(ts));
}

/** Fecha local de hoy, desplazada `days` días (negativo = atrás). */
export function addLocalDays(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}
