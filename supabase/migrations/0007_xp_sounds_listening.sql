-- 0007 · XP para Sonidos y Escucha.
-- Amplía los orígenes permitidos de xp_events. Idempotente.
-- Ejecutar a mano en el SQL editor de Supabase.

alter table public.xp_events drop constraint if exists xp_events_source_check;
alter table public.xp_events add constraint xp_events_source_check
  check (source in ('conversation','roleplay','story','review','daily_lesson','sound','listening'));
