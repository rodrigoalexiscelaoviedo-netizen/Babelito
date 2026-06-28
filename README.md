# Babelito 🗣️

Un coach de inglés con IA, **multi-usuario**, que se adapta al nivel, los errores y los objetivos de cada persona.

Cualquiera se registra → hace una ficha previa → un autodiagnóstico estima su nivel → y desde ahí cada conversación se calibra a esa persona y sube la vara a medida que progresa.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **IA:** Claude (Anthropic) vía Edge Function proxy — la API key nunca toca el navegador
- **Voz:** Web Speech API nativa (STT + TTS), sin dependencias externas
- **Deploy:** Vercel

## Módulos

| Ruta | Qué hace |
|------|----------|
| `/login` | Registro / ingreso (Supabase Auth) |
| `/onboarding` | Ficha previa: objetivo, nivel auto-percibido, acento, intereses |
| `/diagnostic` | Autodiagnóstico de 16 preguntas graduadas A1→C1 |
| `/` | Dashboard: racha, nivel, sesiones, sugerencia del coach |
| `/conversation` | **Core:** chat de voz/texto con feedback estructurado |
| `/chunks` | Biblioteca de expresiones (flip cards) + modo drill |
| `/correct` | Corrector de texto libre (emails, mensajes) |
| `/roleplay` | 6 escenarios donde el coach actúa un personaje |
| `/progress` | Estadísticas: actividad, errores frecuentes, tiempo |
| `/profile` | Editar perfil, re-test, logout |

## Cómo funciona la adaptación

El coach **no tiene un prompt fijo**. En cada sesión, `buildConversationPrompt()` arma el system prompt en vivo combinando:

1. El **perfil** del usuario (nivel actual, objetivo, intereses, acento).
2. Los **errores reales** que viene cometiendo (últimos 20, leídos de la tabla `errors`).
3. El **registro** de complejidad acorde al nivel (A2 habla simple, C1 exige matiz).

Cada respuesta del coach incluye una línea oculta `<<ERRORS: ...>>` que el front parsea, oculta y guarda. Así el mapa de errores se construye solo y alimenta tanto el dashboard como el siguiente prompt. Es un loop.

---

## Setup local

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completá en `.env.local`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

(La anon key está en Supabase → Settings → API → Project API keys → `anon` / `public`.)

### 3. Base de datos

En Supabase → **SQL Editor**, pegá y corré el contenido de:

```
supabase/migrations/0001_init_schema.sql
```

Es idempotente: seguro de correr más de una vez. Crea tablas, RLS, triggers y siembra los chunks iniciales.

### 4. Edge Function (el proxy a Claude)

Necesitás el [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref TU-PROJECT-REF
supabase functions deploy claude-proxy --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-tu-key-nueva
```

> `--no-verify-jwt` porque la función valida el token del usuario a mano (así controla quién gasta tokens sin depender del gateway).

### 5. Auth: desactivar confirmación de email (para testear)

Supabase → Authentication → Providers → Email → desactivá **"Confirm email"**.
Si no, el signup queda esperando que el usuario confirme por mail antes de entrar.

### 6. Correr

```bash
npm run dev
```

---

## Deploy a Vercel

1. Importá el repo en Vercel.
2. Framework preset: **Vite**.
3. Environment Variables: cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

El archivo `vercel.json` (opcional) para que el routing SPA funcione:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## Estructura

```
src/
├── lib/            # lógica pura: tipos, prompts, preguntas, speech, cliente
├── context/        # AuthContext (sesión + perfil)
├── components/     # Nav, Layout, VoiceOrb, ProtectedRoute, Loader
└── pages/          # una por módulo
supabase/
├── migrations/     # schema SQL
└── functions/      # claude-proxy (Edge Function)
```

## Seguridad

- La API key de Anthropic vive **solo** como secret de la Edge Function.
- La `service_role` de Supabase **nunca** va al frontend ni al repo.
- Todas las tablas tienen Row Level Security: cada usuario ve únicamente lo suyo.
- El `.env.local` está en `.gitignore`.
