# Babelito 🗣️

Coach de idiomas con IA que se adapta a tu nivel, tus errores y tus objetivos. Hoy aprende **inglés** y **catalán**.

Registro → ficha previa → diagnóstico (escrito, lectura en voz alta y conversación) → desde ahí cada práctica se calibra a vos.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router + i18next
- **Backend:** Supabase (Postgres + Auth + Edge Functions + pg_cron)
- **IA:** Gemini vía Edge Function (`claude-proxy`). La clave nunca llega al navegador.
- **Voz:** Web Speech API (reconocimiento y lectura), nativa del navegador
- **Recordatorios:** Web Push con service worker y envío desde el servidor
- **Monitoreo:** Sentry (opcional, activo si hay `VITE_SENTRY_DSN`)
- **Tests:** Vitest (unitarios) · Playwright (end-to-end de idioma) · ESLint
- **Deploy:** Vercel (frontend) · Supabase (base, funciones)

## Desarrollo

```bash
npm install
cp .env.local.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript estricto |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run e2e` | Playwright (requiere cuenta de prueba, ver `docs/DESPLIEGUE.md`) |
| `npm run build` | Typecheck + build de producción |
| `npm run seed:catalan` | Carga el contenido catalán inicial (service role, ver `scripts/seed/`) |

## Despliegue

Ver [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) y [`docs/RECORDATORIOS.md`](docs/RECORDATORIOS.md).
Las migraciones SQL y las Edge Functions **no** se despliegan con el push: se ejecutan a mano.

## Módulos

| Ruta | Qué hace |
|---|---|
| `/login` | Registro e ingreso |
| `/onboarding` | Idioma, objetivo, nivel auto-percibido, intereses |
| `/diagnostic` | Diagnóstico A1→C1: 16 preguntas, lectura en voz alta y respuesta hablada (en inglés o catalán) |
| `/` | Inicio: práctica del día, racha, sugerencia del coach |
| `/conversation` | Conversación con el coach: voz o texto, con feedback estructurado |
| `/roleplay` | Escenas de rol (negocios en inglés; vida cotidiana en catalán) |
| `/chunks` | Biblioteca de expresiones con modo repaso |
| `/review` | Repaso espaciado (SRS) |
| `/reading` | Lectura con diccionario al tocar palabras |
| `/stories` | Historias generadas por IA, con lectura y vocabulario |
| `/sounds` · `/listening` | Sonidos y patrones de habla conectada |
| `/correct` | Corrector de textos libres (correos, mensajes) |
| `/progress` | Actividad, errores frecuentes, informes de sesión, logros |
| `/profile` | Voz, notificaciones, idioma, reinicio de diagnóstico |

## Idiomas

- La interfaz sigue al idioma que se aprende (`src/i18n/`). Textos en `en.ts` y `ca.ts` con las mismas claves; TypeScript y un test verifican la paridad.
- Las **ayudas de comprensión** (pistas, glosas, explicaciones de errores) van en **español neutro**.
- El TTS siempre usa una voz del idioma del contenido (`ca-ES` para catalán), nunca la voz inglesa por defecto.

## Estructura

```
src/
  components/   UI compartida (Nav, Charts, ShadowingBlock, ...)
  context/      AuthContext (sesión y perfil, con error visible)
  i18n/         Textos de interfaz (en, ca)
  lib/          Lógica: SRS, racha, diagnóstico, coach, voz, notificaciones, fechas locales
  pages/        Una pantalla por módulo
supabase/
  functions/    claude-proxy · send-reminders
  migrations/   0001…0004 (0004 = push, cuota del coach, caché de diccionario)
scripts/seed/   Carga de contenido catalán
e2e/            Playwright
docs/           Despliegue y recordatorios
```
