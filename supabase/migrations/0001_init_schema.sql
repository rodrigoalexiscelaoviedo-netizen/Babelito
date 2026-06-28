-- ============================================================
-- BABELITO — Schema inicial (idempotente)
-- Multi-usuario con Supabase Auth. Cada usuario ve solo lo suyo.
-- Correr en Supabase SQL Editor (manual). Seguro de correr más de una vez.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES — 1:1 con auth.users. Guarda ficha previa + nivel.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  native_language text default 'Spanish',
  -- para qué quiere el inglés: work / travel / career / exams / general
  learning_goal text,
  -- auto-percepción inicial (la que dice el usuario en la ficha)
  self_assessed_level text,
  -- nivel que devolvió el autodiagnóstico
  diagnosed_level text,
  -- nivel vigente (arranca = diagnosed_level, se recalcula con el uso)
  current_level text default 'A2',
  target_level text default 'B2',
  english_variant text default 'British',
  onboarding_complete boolean default false,
  diagnostic_complete boolean default false,
  -- bolsa flexible: hobbies, contexto laboral, intereses, lo que sea
  profile_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- SESSIONS — una conversación / roleplay / corrección completa
-- ------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null
    check (session_type in ('conversation','roleplay','text_correction')),
  topic text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  mood text check (mood in ('confident','neutral','stuck')),
  -- array de turnos: [{ role:'user'|'assistant', content:'...' }]
  messages jsonb default '[]'::jsonb,
  -- resumen corto auto-generado al cerrar
  summary text,
  created_at timestamptz default now()
);

create index if not exists sessions_user_idx on public.sessions(user_id, created_at desc);

-- ------------------------------------------------------------
-- ERRORS — cada error detectado por el coach en una sesión
-- ------------------------------------------------------------
create table if not exists public.errors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  error_type text not null,        -- ej: missing_to, omitting_subject, false_friend
  original_text text,              -- lo que escribió el usuario
  correction text,                 -- versión corregida
  explanation text,                -- por qué, en 1 línea
  created_at timestamptz default now()
);

create index if not exists errors_user_idx on public.errors(user_id, created_at desc);
create index if not exists errors_type_idx on public.errors(user_id, error_type);

-- ------------------------------------------------------------
-- CHUNKS — biblioteca global de expresiones (compartida)
-- ------------------------------------------------------------
create table if not exists public.chunks (
  id bigserial primary key,
  category text not null,
  english text not null,
  spanish text not null,
  example text,
  british_version text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- USER_CHUNKS — progreso de aprendizaje por usuario
-- ------------------------------------------------------------
create table if not exists public.user_chunks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_id bigint not null references public.chunks(id) on delete cascade,
  learned_at timestamptz default now(),
  unique(user_id, chunk_id)
);

-- ------------------------------------------------------------
-- DIAGNOSTICS — cada vez que el usuario hace el autodiagnóstico
-- ------------------------------------------------------------
create table if not exists public.diagnostics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb default '[]'::jsonb,
  raw_score integer,
  estimated_level text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- DRILLS — práctica dirigida de un tipo de error
-- ------------------------------------------------------------
create table if not exists public.drills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  error_type text not null,
  items jsonb default '[]'::jsonb,
  score integer,
  total integer,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- TRIGGER: updated_at automático en profiles
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: crear profile automáticamente al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.sessions    enable row level security;
alter table public.errors      enable row level security;
alter table public.user_chunks enable row level security;
alter table public.diagnostics enable row level security;
alter table public.drills      enable row level security;
alter table public.chunks      enable row level security;

-- profiles: cada quien el suyo
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

-- helper macro repetido para tablas con user_id
-- sessions
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- errors
drop policy if exists "own errors" on public.errors;
create policy "own errors" on public.errors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- user_chunks
drop policy if exists "own user_chunks" on public.user_chunks;
create policy "own user_chunks" on public.user_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- diagnostics
drop policy if exists "own diagnostics" on public.diagnostics;
create policy "own diagnostics" on public.diagnostics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- drills
drop policy if exists "own drills" on public.drills;
create policy "own drills" on public.drills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chunks: lectura para cualquier usuario autenticado, sin escritura
drop policy if exists "chunks readable" on public.chunks;
create policy "chunks readable" on public.chunks
  for select using (auth.role() = 'authenticated');

-- ============================================================
-- SEED: chunks iniciales (solo si la tabla está vacía)
-- ============================================================
insert into public.chunks (category, english, spanish, example, british_version)
select * from (values
  ('meetings','Let''s get started.','Empecemos.','Okay everyone, let''s get started — we have a lot to cover today.','Right, shall we crack on?'),
  ('meetings','The purpose of this meeting is to...','El objetivo de esta reunión es...','The purpose of this meeting is to review last month''s sales numbers.','What we''re here to sort out today is...'),
  ('meetings','Just to bring everyone up to speed...','Solo para poner a todos al día...','Just to bring everyone up to speed, we closed two deals this week.','Just to fill you all in...'),
  ('opinion','From my point of view...','Desde mi punto de vista...','From my point of view, the team needs more support on outbound calls.','The way I see it...'),
  ('opinion','That''s a fair point, but...','Es un buen punto, pero...','That''s a fair point, but I don''t think we have enough time this quarter.','Fair enough, but...'),
  ('clarification','Could you run that by me again?','¿Podrías repetirme eso?','Sorry, could you run that by me again? I want to make sure I understood.','Sorry, could you say that again?'),
  ('clarification','Just to clarify, are you saying that...?','Solo para aclarar, ¿estás diciendo que...?','Just to clarify, are you saying that we need to close the deal by Friday?','So if I''ve got this right, you''re saying...?'),
  ('email','I hope this email finds you well.','Espero que este correo te encuentre bien.','Hi Sarah, I hope this email finds you well.','Hope you''re keeping well.'),
  ('email','I''m writing to follow up on...','Te escribo para hacer seguimiento de...','I''m writing to follow up on our conversation from last Tuesday.','I just wanted to chase up on...'),
  ('email','Looking forward to hearing from you.','Espero tu respuesta.','Please let me know what works best. Looking forward to hearing from you.','Hope to hear from you soon.'),
  ('presentation','What I''d like to show you today is...','Lo que quiero mostrarles hoy es...','What I''d like to show you today is our new outbound strategy.','What I want to walk you through today is...'),
  ('presentation','The bottom line is...','La conclusión es...','The bottom line is, we increased sales by 20% this quarter.','At the end of the day...'),
  ('presentation','Let me walk you through...','Déjame guiarte por...','Let me walk you through the numbers from last month.','Let me take you through...'),
  ('buytime','That''s a good question, let me think.','Buena pregunta, déjame pensar.','That''s a good question, let me think about it for a second.','Good question — give me a moment.'),
  ('buytime','What I mean is...','Lo que quiero decir es...','What I mean is, we need more time to close this properly.','What I''m getting at is...'),
  ('buytime','Sorry, let me rephrase that.','Perdón, déjame reformularlo.','Sorry, let me rephrase that — what I''m trying to say is...','Let me put that another way.')
) as seed
where not exists (select 1 from public.chunks);
