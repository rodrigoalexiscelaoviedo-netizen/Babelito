-- 0004 · Hardening premium: push real, cuota del coach, caché de diccionario.
-- Idempotente. Lo ejecuta Rodrigo a mano en el SQL editor de Supabase
-- (el push a git NO aplica migraciones ni despliega funciones).

-- ── 1. Recordatorios por Web Push ─────────────────────────────────────────────
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists notification_last_sent_on date;

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 2. Cuota diaria del coach (protege la cuota gratuita de Gemini) ──────────
create table if not exists public.coach_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null,
  calls   int  not null default 0,
  primary key (user_id, day)
);
alter table public.coach_usage enable row level security;
-- Sin políticas: solo la función security definer toca esta tabla.

create or replace function public.consume_coach_call(p_daily_limit int default 300)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n   int;
begin
  if uid is null then return false; end if;

  insert into public.coach_usage (user_id, day, calls)
  values (uid, current_date, 1)
  on conflict (user_id, day)
  do update set calls = coach_usage.calls + 1
  where coach_usage.calls < p_daily_limit
  returning calls into n;

  return n is not null;
end;
$$;

revoke all on function public.consume_coach_call(int) from public;
grant execute on function public.consume_coach_call(int) to authenticated;

-- ── 3. Caché compartida de definiciones (diccionario) ────────────────────────
create table if not exists public.word_definitions (
  lang       text not null,
  word       text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (lang, word)
);
alter table public.word_definitions enable row level security;

drop policy if exists "definitions readable" on public.word_definitions;
create policy "definitions readable" on public.word_definitions
  for select to authenticated using (true);

drop policy if exists "definitions insertable" on public.word_definitions;
create policy "definitions insertable" on public.word_definitions
  for insert to authenticated with check (true);

-- ── 4. Re-leveling continuo: historial y control de consolidación diaria ──────
alter table public.profiles add column if not exists level_updated_on date;

create table if not exists public.level_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  from_level text not null,
  to_level   text not null,
  score      real,
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists level_history_user_idx on public.level_history(user_id, created_at desc);

alter table public.level_history enable row level security;

drop policy if exists "own level history" on public.level_history;
create policy "own level history" on public.level_history
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
