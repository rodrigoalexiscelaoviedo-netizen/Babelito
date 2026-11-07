# 5. Base de datos

Motor: **Postgres en Supabase**. Proyecto **Babelito** (`gxmarhrrvhjtpzvaqoll`). Todas las tablas tienen **RLS** (seguridad por fila): cada persona solo lee y escribe lo suyo.

## Advertencia importante: producción ≠ migraciones

Las migraciones de `supabase/migrations/` (0001–0008) **no reproducen fielmente** la base de producción. Parte del esquema se armó a mano en el editor SQL de Supabase (columnas `language`, varias de `profiles`, etc.). Ejemplos de diferencias ya encontradas:

| Diferencia | Efecto |
|---|---|
| `user_vocabulary` **no tiene** la columna `phonetic` | Guardar palabras fallaba en silencio. El código ahora lo tolera (`vocabulary.ts`). |
| `profiles` **no tiene** `level_source` | Cualquier consulta que la pida da error 400. |
| La columna `language` se agregó a mano a varias tablas | Las filas viejas pueden tener `language = null`; se tratan como inglés (`language.ts`). |
| `xp_events.source` tiene una restricción (`check`) que hay que ampliar con cada fuente nueva | Una fuente no permitida hace fallar el insert (ver migraciones 0007 y 0008). |

**Regla de oro:** antes de recrear o cambiar algo, comparar contra producción (ver más abajo cómo consultar el esquema real).

## Tablas observadas en producción

Columnas leídas de la base real al cierre (tipo observado; `?` = no se pudo ver por estar vacía o nula). Sin datos de usuarios.

### Cuenta y perfil

**`profiles`** — una fila por persona (id = id de Auth).
`id`, `email`, `name`, `native_language`, `learning_goal`, `self_assessed_level`, `diagnosed_level`, `current_level`, `target_level`, `english_variant`, `onboarding_complete`, `diagnostic_complete`, `profile_json` (intereses y otros datos), `created_at`, `updated_at`, `voice_name`, `voice_rate`, `voice_accent`, `notification_time`, `notification_sent_today`, `streak_freezes`, `last_freeze_reset`, `learning_language`, `language_streak`, `timezone`, `notification_last_sent_on`, `level_updated_on`.

**`push_subscriptions`** — dispositivos suscritos a notificaciones: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`.

**`coach_usage`** — `user_id`, `day`, `calls`. Cuota diaria del coach. Sin políticas: solo la función `consume_coach_call` la toca.

### Actividad y progreso

**`sessions`** — conversaciones y roleplays: `id`, `user_id`, `session_type`, `topic`, `started_at`, `ended_at`, `duration_seconds`, `mood`, `messages` (lista de turnos), `summary`, `created_at`, `completed`, `turn_count`.

**`errors`** — errores detectados por el coach: `id`, `user_id`, `session_id`, `error_type`, `original_text`, `correction`, `explanation`, `created_at`.

**`session_reports`** — informe de cada sesión: `id`, `user_id`, `session_id`, `kind`, `summary`, `did_well`, `key_errors`, `suggested_chunks`, `created_at`, `language`.

**`daily_lessons`** — práctica del día: `id`, `user_id`, `lesson_date`, `chunk_id`, `word`, `topic`, `completed`, `completed_at`, `created_at`, `chunk_done`, `convo_done`, `word_done`, `language`.

**`xp_events`** — un evento por actividad con XP: `id`, `user_id`, `ref_key` (única por usuario), `source`, `amount` (1–200), `meta`, `created_at`.

**`achievements`** — logros desbloqueados: `id`, `user_id`, `achievement_key`, `unlocked_at`, `seen`.

**`level_history`** — cambios de nivel: `id`, `user_id`, `from_level`, `to_level`, `score`, `reason`, `created_at`.

**`diagnostics`** — resultados del test de nivel: `id`, `user_id`, `answers`, `raw_score`, `estimated_level`, `oral_reading_transcript`, `oral_reading_level`, `oral_open_transcript`, `oral_open_level`, `oral_level`, `final_level`, `completed`, `completed_at`, `created_at`.

**`situation_progress`** — avance de Situaciones y de Gramática (las lecciones usan `pack_id = "grammar:<id>"`). Creada en la migración 0008; en producción estaba vacía al cierre.

**`story_progress`** — avance en historias: `id`, `user_id`, `story_id`, `completed`, `score`, `completed_at`, `created_at`.

### Aprendizaje (lo que se guarda para repasar)

**`user_vocabulary`** — palabras guardadas: `id`, `user_id`, `word`, `language`, `status` (`new` / `learning` / `known`), `definition`, `example`, `times_seen`, `source`, `created_at`, `updated_at`.

**`review_items`** — mazo del repaso (SRS): `id`, `user_id`, `item_type` (`word` / `chunk`), `content`, `prompt` (ayuda en español), `source_ref`, `interval_days`, `ease`, `reps`, `next_review`, `last_reviewed`, `created_at`, `language`. Única por `(user_id, item_type, content)`.

**`user_chunks`** — expresiones propias de la persona (vacía al cierre).

**`drills`** — ejercicios guardados (vacía al cierre).

### Contenido compartido (lo ven todos)

**`chunks`** — biblioteca de expresiones: `id`, `category`, `english`, `spanish`, `example`, `british_version`, `created_at`, `language`. Al cierre: **98** (16 en inglés, 82 en catalán).

**`stories`** — historias: `id`, `user_id` (nulo si es de la biblioteca), `level`, `title`, `content`, `topic`, `questions` (lista de preguntas), `source`, `created_at`, `language`. Al cierre: **42** (27 en inglés, 15 en catalán). Dos de las historias en inglés de producción no están en los archivos SQL del proyecto.

**`word_definitions`** — caché compartida del diccionario: `lang`, `word`, `data` (traducción, categoría, usos, ejemplo, fonética), `created_at`. Cualquiera puede leer e insertar. Las filas con el formato viejo (definiciones largas) se vuelven a pedir y se reescriben cuando la política lo permite.

## Funciones SQL

- **`consume_coach_call(p_daily_limit int default 300)`** — descuenta una llamada de la cuota diaria del coach de la persona y devuelve si estaba permitida. Solo `authenticated` puede ejecutarla.
- **`set_updated_at()`** y **`handle_new_user()`** — mantienen `updated_at` y crean el perfil al registrarse.

## Tareas programadas

`pg_cron` ejecuta cada 15 minutos la función `send-reminders` (ver `08-recrear-desde-cero.md`).

## Migraciones (`supabase/migrations/`)

| Archivo | Qué hace |
|---|---|
| `0001_init_schema.sql` | Perfiles, sesiones, errores, expresiones, diagnósticos, ejercicios, RLS y las 16 expresiones iniciales |
| `0002_schema_real.sql` | Práctica del día, vocabulario, repaso, informes, historias, progreso de historias y logros |
| `0003_seed_catalan.sql` | **Anulada, no correr.** Se reemplazó por `npm run seed:catalan` |
| `0004_premium_hardening.sql` | Notificaciones push, cuota del coach, caché de diccionario, historial de nivel, zona horaria |
| `0005_xp_and_story_library.sql` | XP y 9 historias en inglés |
| `0006_a1_stories.sql` | 4 historias A1 |
| `0007_xp_sounds_listening.sql` | XP de Sonidos y Escucha |
| `0008_situations.sql` | Avance de Situaciones y fuente de XP `situation` |

Además `supabase/seeds_stories.sql` (12 historias de nivel A2–B2) y `scripts/seed/` (contenido catalán).

## Cómo consultar el esquema real de producción

En Supabase → **SQL Editor** (proyecto Babelito), ejecutar de solo lectura:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select tablename, policyname, cmd from pg_policies where schemaname = 'public';
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';
```

Guardar el resultado en esta carpeta resuelve la diferencia entre migraciones y producción.
