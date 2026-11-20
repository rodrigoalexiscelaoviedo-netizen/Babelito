-- 0010 · Resultados por habilidad (lectura y escucha) para estimar el nivel de cada una.
-- Cada fila es un intento: cuántas respuestas acertó la persona de cuántas.
-- Idempotente: se puede correr más de una vez.

create table if not exists public.skill_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  skill      text not null check (skill in ('reading', 'listening')),
  correct    integer not null check (correct >= 0),
  total      integer not null check (total > 0 and correct <= total),
  created_at timestamptz not null default now()
);

create index if not exists skill_attempts_user_idx on public.skill_attempts(user_id, skill, created_at desc);

alter table public.skill_attempts enable row level security;

drop policy if exists "own skill attempts" on public.skill_attempts;
create policy "own skill attempts" on public.skill_attempts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
