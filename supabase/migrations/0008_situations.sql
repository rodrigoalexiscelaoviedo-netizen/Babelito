-- 0008 · Situaciones (misiones por temática) y su XP.
-- Idempotente. Ejecutar a mano en el SQL editor de Supabase.

-- ── 1. Progreso por situación ──────────────────────────────────────────────────
create table if not exists public.situation_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  pack_id      text not null check (char_length(pack_id) <= 60),
  steps        jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, pack_id)
);

alter table public.situation_progress enable row level security;

drop policy if exists "own situation progress" on public.situation_progress;
create policy "own situation progress" on public.situation_progress
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 2. Nuevo origen de XP ──────────────────────────────────────────────────────
alter table public.xp_events drop constraint if exists xp_events_source_check;
alter table public.xp_events add constraint xp_events_source_check
  check (source in ('conversation','roleplay','story','review','daily_lesson','sound','listening','situation'));
