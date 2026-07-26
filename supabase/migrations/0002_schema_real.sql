-- 0002_schema_real.sql
--
-- Reconstrucción del esquema que HOY existe en producción pero nunca se
-- versionó: 0001_init_schema.sql declara 7 tablas y el código usa 13. Estas 7
-- se crearon a mano en el SQL Editor, así que el repo perdió el rastro de sus
-- columnas — origen de fondo de los bugs recurrentes por nombres asumidos.
--
-- ⚠️ NO EJECUTADO POR EL AGENTE. Revisalo y corrélo vos en el SQL Editor.
--
-- Es idempotente (create table if not exists / add column if not exists), así
-- que sobre una base que ya tiene estas tablas NO las modifica: sirve para
-- dejar el repo alineado y para poder recrear el entorno desde cero.
--
-- ⚠️ Todo lo marcado [INFERIDO] es un tipo deducido del uso en el código, no
-- verificado contra la base. Si difiere de producción, gana producción:
-- ajustá este archivo, no la tabla.

-- ─────────────────────────────────────────────────────────────────────────
-- daily_lessons — práctica diaria (tríada)
-- Columnas confirmadas por el usuario contra producción.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_lessons (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_date  date not null,
  chunk_id     bigint references public.chunks(id) on delete set null,
  word         text,
  topic        text not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- Tildes por ítem de la tríada (ya ejecutado por el usuario antes de este deploy).
alter table public.daily_lessons
  add column if not exists chunk_done boolean not null default false,
  add column if not exists convo_done boolean not null default false,
  add column if not exists word_done  boolean not null default false;

-- getTodayLesson busca por (user_id, lesson_date) y asume una fila por día.
create unique index if not exists daily_lessons_user_date_idx
  on public.daily_lessons (user_id, lesson_date);

-- ─────────────────────────────────────────────────────────────────────────
-- user_vocabulary — palabras seguidas por el usuario
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.user_vocabulary (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  word       text not null,
  status     text not null default 'new' check (status in ('new','learning','known')),
  definition text,
  example    text,
  phonetic   text,
  source     text,                        -- [INFERIDO] módulo de origen ("reading" | "stories")
  times_seen integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- upsertWord busca por (user_id, word) en minúsculas.
create unique index if not exists user_vocabulary_user_word_idx
  on public.user_vocabulary (user_id, word);

-- ─────────────────────────────────────────────────────────────────────────
-- review_items — repaso espaciado (SRS)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.review_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  item_type     text not null check (item_type in ('chunk','word')),
  content       text not null,            -- frase/palabra en inglés a decir
  prompt        text not null,            -- pista en español mostrada antes
  source_ref    text not null,            -- id de chunk (string) o la palabra
  interval_days integer not null default 1,
  ease          real    not null default 2.5,   -- [INFERIDO] numeric también sirve
  reps          integer not null default 0,
  next_review   date    not null default current_date,
  last_reviewed timestamptz,              -- [INFERIDO] date si solo guardás el día
  created_at    timestamptz default now()
);

-- addToReview hace upsert; countDue filtra por next_review <= hoy.
create unique index if not exists review_items_user_type_ref_idx
  on public.review_items (user_id, item_type, source_ref);
create index if not exists review_items_due_idx
  on public.review_items (user_id, next_review);

-- ─────────────────────────────────────────────────────────────────────────
-- session_reports — reportes generados por IA al cerrar una sesión
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.session_reports (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  session_id       uuid references public.sessions(id) on delete set null,
  kind             text not null,         -- [INFERIDO] 'conversation' | 'roleplay'
  summary          text,
  did_well         jsonb default '[]'::jsonb,
  key_errors       jsonb default '[]'::jsonb,   -- [{error, correction}]
  suggested_chunks jsonb default '[]'::jsonb,
  created_at       timestamptz default now()
);

create index if not exists session_reports_user_created_idx
  on public.session_reports (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- stories — historias (precargadas o generadas por IA)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.stories (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  level      text not null,               -- [INFERIDO] A1..C1, sin check en prod
  topic      text,
  content    text not null,
  source     text not null default 'preloaded' check (source in ('preloaded','ai_generated')),
  user_id    uuid references auth.users(id) on delete cascade,  -- null = global
  questions  jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- story_progress — historias terminadas (3ª fuente de la racha)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.story_progress (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  story_id   uuid not null references public.stories(id) on delete cascade,
  completed  boolean not null default false,
  score      integer default 0,
  created_at timestamptz default now()
);

-- saveStoryProgress hace upsert por (user_id, story_id).
create unique index if not exists story_progress_user_story_idx
  on public.story_progress (user_id, story_id);

-- ─────────────────────────────────────────────────────────────────────────
-- achievements — logros desbloqueados
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  seen            boolean not null default false,
  created_at      timestamptz default now()
);

create unique index if not exists achievements_user_key_idx
  on public.achievements (user_id, achievement_key);

-- ─────────────────────────────────────────────────────────────────────────
-- Columnas agregadas a mano sobre tablas que SÍ están en 0001
-- ─────────────────────────────────────────────────────────────────────────
alter table public.sessions
  add column if not exists completed  boolean not null default false,
  add column if not exists turn_count integer not null default 0;

alter table public.profiles
  add column if not exists streak_freezes     integer not null default 2,
  add column if not exists last_freeze_reset  date,
  add column if not exists voice_name         text,
  add column if not exists voice_rate         real,      -- [INFERIDO]
  add column if not exists voice_accent       text;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — el patrón de 0001 es "cada usuario ve solo lo suyo".
-- ⚠️ Estas políticas NO fueron verificadas contra producción. Si ya existen
-- con otro nombre, este bloque las duplicaría: revisá antes de correrlo.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.daily_lessons    enable row level security;
alter table public.user_vocabulary  enable row level security;
alter table public.review_items     enable row level security;
alter table public.session_reports  enable row level security;
alter table public.story_progress   enable row level security;
alter table public.achievements     enable row level security;
alter table public.stories          enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'daily_lessons','user_vocabulary','review_items',
    'session_reports','story_progress','achievements'
  ] loop
    execute format(
      'create policy if not exists %I on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_own', t
    );
  end loop;
end $$;

-- stories: las globales (user_id null) las lee cualquiera; las propias, su dueño.
create policy if not exists stories_read on public.stories
  for select using (user_id is null or auth.uid() = user_id);
create policy if not exists stories_write on public.stories
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Pendiente de decisión (NO incluido acá a propósito):
-- public.drills está en 0001 pero ningún módulo la usa. Confirmá si se puede
-- borrar antes de tocarla.
-- ─────────────────────────────────────────────────────────────────────────
