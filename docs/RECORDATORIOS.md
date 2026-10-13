# Recordatorios diarios (Web Push)

Los recordatorios salen del servidor, no de la app: llegan aunque Babelito esté cerrado.
Funciona en Android (Chrome), escritorio, y en iPhone/iPad **solo si la app está instalada en pantalla de inicio** (iOS 16.4+).

## Piezas

| Pieza | Dónde |
|---|---|
| Suscripción del dispositivo | `src/lib/notifications.ts` → tabla `push_subscriptions` |
| Hora local del usuario | columna `profiles.timezone` (se guarda al guardar el perfil) |
| Envío | Edge Function `supabase/functions/send-reminders` |
| Disparo cada 15 min | `pg_cron` (abajo) |
| Mostrar la notificación | `public/sw.js` (evento `push`) |

Reglas del envío: se manda dentro de los 15 minutos posteriores a la hora elegida, una vez por día (`notification_last_sent_on`), y **no** se manda si la práctica del día ya está completa.

## 1. Generar claves VAPID (una sola vez)

```bash
npx web-push@3.6.7 generate-vapid-keys
```

Guardá las dos claves. La **pública** va a la app; la **privada** nunca sale del servidor.

## 2. Variables

Vercel (Project → Settings → Environment Variables):

- `VITE_VAPID_PUBLIC_KEY` = clave pública
- `VITE_SENTRY_DSN` = (opcional) DSN de Sentry
- `VITE_APP_VERSION` = `0.2.0`

Supabase (secretos de las Edge Functions):

```bash
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@email.com
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
supabase secrets set ALLOWED_ORIGIN=https://TU-APP.vercel.app COACH_DAILY_LIMIT=300
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.

## 3. Migración

En el SQL editor de Supabase, ejecutar `supabase/migrations/0004_premium_hardening.sql` completo. Es idempotente.

## 4. Desplegar las funciones

```bash
supabase functions deploy send-reminders --no-verify-jwt
supabase functions deploy claude-proxy
```

`send-reminders` usa `--no-verify-jwt` porque lo llama el cron con un secreto (`x-cron-secret`), no con un JWT de usuario.

Limpiar lo que ya no existe en el proyecto remoto:

```bash
supabase functions delete live-proxy
supabase functions delete live-proxy-echo-test
```

## 5. Programar el cron

En Supabase: Database → Extensions → habilitar `pg_cron` y `pg_net`. Guardar el secreto en Vault:

```sql
select vault.create_secret('PEGAR_CRON_SECRET', 'cron_secret');
```

Luego programar:

```sql
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    )
  );
  $$
);
```

Reemplazar `PROJECT_REF`. Para ver las ejecuciones: `select * from cron.job_run_details order by start_time desc limit 20;`

## 6. Probar

1. En Perfil → activar notificaciones → aceptar el permiso → elegir una hora dentro de 15 minutos → Guardar.
2. Esperar al siguiente ciclo del cron.
3. Ver la respuesta en `cron.job_run_details` o llamando a la función con el secreto: `{"sent":1,...}`.

## Limitaciones conocidas

- Un push solo se entrega si el navegador/SO sigue teniendo el permiso. Si el usuario lo revoca, la suscripción se borra sola (código 404/410).
- Cada dispositivo tiene su propia suscripción: el usuario puede recibir el aviso en el celular y no en la PC.
