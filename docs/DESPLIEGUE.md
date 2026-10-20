# Despliegue y operación

Principio: **commit ≠ push ≠ deploy.** Ninguno de estos pasos sucede solo con `git push`:

1. **Migraciones SQL** → se ejecutan a mano en el SQL editor de Supabase (`supabase/migrations/`).
2. **Edge Functions** → `supabase functions deploy <nombre>` (ver `docs/RECORDATORIOS.md`).
3. **Frontend** → Vercel despliega al pushear a `main`.

## Orden para una versión nueva

1. Revisar `npm run typecheck && npm run lint && npm test`.
2. Ejecutar las migraciones nuevas en Supabase.
3. Desplegar las Edge Functions cambiadas.
4. Push a `main` → Vercel.
5. Verificar en el celular: login, práctica del día, una conversación, y una notificación de prueba.

## Variables

| Dónde | Variable | Obligatoria | Uso |
|---|---|---|---|
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | sí | Cliente |
| Vercel | `VITE_VAPID_PUBLIC_KEY` | sí (recordatorios) | Web Push |
| Vercel | `VITE_SENTRY_DSN` | no | Errores en producción |
| Supabase | `GEMINI_API_KEY` | sí | Coach |
| Supabase | `ALLOWED_ORIGIN`, `COACH_DAILY_LIMIT` | recomendada | Seguridad y cuota |
| Supabase | `VAPID_*`, `CRON_SECRET` | sí (recordatorios) | Push |

## Calidad

- `npm run typecheck` — TypeScript estricto.
- `npm run lint` — ESLint (reglas de hooks y TypeScript).
- `npm test` — Vitest: fechas locales, banco de diagnóstico, paridad i18n, contenido catalán.
- `npm run e2e` — Playwright: recorre las pantallas con una cuenta catalana y falla si aparece inglés o voseo. Requiere `E2E_EMAIL`, `E2E_PASSWORD` (y `npx playwright install chromium` la primera vez).

## Seguridad aplicada

- Cabeceras en `vercel.json`: HSTS, CSP, `X-Frame-Options: DENY`, `Permissions-Policy` (micrófono solo para la app).
- `claude-proxy`: JWT obligatorio, cuota diaria por usuario (`consume_coach_call`), límites de tamaño del payload, origen restringido.
- RLS en todas las tablas. `coach_usage` no tiene políticas: solo la función lo toca.
- Eliminado `live-proxy` (el JWT iba en la URL del WebSocket y quedaba en logs).
