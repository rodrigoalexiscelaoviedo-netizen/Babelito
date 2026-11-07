# 8. Recrear y operar la app

Principio: **commit ≠ push ≠ deploy.** Subir el código a GitHub no actualiza Supabase. Hay tres cosas que se publican por separado:

1. **Migraciones SQL** → a mano en el editor SQL de Supabase.
2. **Funciones del servidor** → `supabase functions deploy` o desde el editor de funciones del panel.
3. **Frontend** → Vercel lo publica solo al hacer push a `main`.

## A. Cuentas necesarias

GitHub · Vercel · Supabase · Google AI Studio (clave de Gemini) · Azure (recurso Speech F0, opcional pero recomendado).

## B. Variables y secretos (solo nombres)

**En Vercel** (Project → Settings → Environment Variables):

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública (anon/publishable) |
| `VITE_VAPID_PUBLIC_KEY` | Para recordatorios | Clave pública de Web Push |
| `VITE_SENTRY_DSN` | No | Errores en producción |
| `VITE_APP_VERSION` | No | Versión que se informa a Sentry |

Para desarrollo local: copiar `.env.local.example` a `.env.local` y completar. **Nunca** commitear `.env.local`.

**En Supabase** (Edge Functions → Secrets):

| Secreto | Obligatoria | Uso |
|---|---|---|
| `GEMINI_API_KEY` | Sí | Coach y herramientas |
| `ALLOWED_ORIGIN` | Recomendada | Origen permitido, p. ej. `https://babelito.vercel.app` |
| `COACH_DAILY_LIMIT` | Opcional | Llamadas por persona por día (300 por defecto) |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Para voz natural y puntaje | Azure (región `northeurope`) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Para recordatorios | Web Push (`VAPID_SUBJECT` = `mailto:…`) |
| `CRON_SECRET` | Para recordatorios | Protege la llamada del cron |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solos.

## C. Pasos para montar todo

1. **Código:** `git clone` del repositorio y `npm install`.
2. **Supabase:** crear el proyecto. En el editor SQL, ejecutar **a mano y en orden** las migraciones `0001`, `0002`, `0004`, `0005`, `0006`, `0007`, `0008` (no correr la `0003`, está anulada). Ver la advertencia de `05-base-de-datos.md`: producción tiene diferencias; después de migrar, comparar contra el esquema real y agregar lo que falte (por ejemplo la columna `phonetic` de `user_vocabulary`).
3. **Contenido:** correr `supabase/seeds_stories.sql` para las 12 historias base. Para el catalán, `npm run seed:catalan` (requiere la service role key; ver `scripts/seed/`).
4. **Secretos:** cargar los de la tabla anterior (`supabase secrets set …` o el panel).
5. **Funciones:** publicar las cinco:
   ```bash
   supabase functions deploy claude-proxy
   supabase functions deploy gemini-tools --no-verify-jwt
   supabase functions deploy speech-tts --no-verify-jwt
   supabase functions deploy pronunciation-assess --no-verify-jwt
   supabase functions deploy send-reminders --no-verify-jwt
   ```
6. **Vercel:** importar el repositorio, cargar las variables y desplegar. `vercel.json` ya trae las cabeceras de seguridad.
7. **Verificar** (lista de comprobación abajo).

## D. Recordatorios (Web Push)

1. Generar las claves VAPID una sola vez: `npx web-push@3.6.7 generate-vapid-keys`. La pública va a Vercel; la privada, a los secretos de Supabase.
2. En Supabase: Database → Extensions → habilitar `pg_cron` y `pg_net`.
3. Guardar el secreto del cron en Vault y programarlo:
   ```sql
   select vault.create_secret('PEGAR_CRON_SECRET', 'cron_secret');

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
   (Reemplazar `PROJECT_REF`.) Para ver ejecuciones: `select * from cron.job_run_details order by start_time desc limit 20;`
4. **Reglas del envío:** se manda dentro de los 15 minutos posteriores a la hora elegida, una vez por día (`notification_last_sent_on`) y no se manda si la práctica del día ya está completa.
5. **Limitaciones:** un push solo se entrega si el navegador o el sistema conserva el permiso (si se revoca, la suscripción se borra sola al recibir 404/410); cada dispositivo tiene su propia suscripción, así que el aviso puede llegar al celular y no a la computadora. Si hubo un proxy de WebSocket anterior, se eliminó: no hay que desplegar `live-proxy`.
6. **Probar:** en Perfil activar notificaciones y elegir una hora dentro de 15 minutos; o llamar a la función con `x-dry-run: 1` y `x-force: 1` para ver los textos sin enviar.

## E. Voz natural y pronunciación (Azure)

1. Azure Portal → crear un recurso **Speech**, plan **F0**, región cercana.
2. Copiar **KEY 1** y la región.
3. Guardarlas como `AZURE_SPEECH_KEY` y `AZURE_SPEECH_REGION` en los secretos de Supabase.
4. Desplegar `speech-tts` y `pronunciation-assess` (sin Verify JWT).

La app consulta cada función con un cuerpo vacío para saber si hay Azure: `501` = no configurado, `400` = disponible.

## F. Calidad antes de publicar

```bash
npm run typecheck   # TypeScript estricto
npm run lint        # ESLint
npm test            # 206 pruebas (Vitest)
npm run build       # typecheck + build de producción
npm run e2e         # Playwright (catalán; requiere E2E_EMAIL y E2E_PASSWORD)
```

Orden recomendado para una versión nueva: revisar calidad → ejecutar migraciones nuevas → desplegar funciones cambiadas → push a `main` → verificar en el celular (ingreso, práctica del día, una conversación, un repaso, una notificación de prueba).

## G. Lista de comprobación tras montar

- [ ] Se puede registrar una cuenta e iniciar sesión.
- [ ] La conversación responde (si no: revisar `GEMINI_API_KEY`).
- [ ] Tocar una palabra en Reading muestra traducción y **se guarda** en "My words" (si no: columna `phonetic`).
- [ ] El repaso abre con tarjetas y se oye el audio.
- [ ] El puntaje de pronunciación aparece en "Listen & repeat" (si no: claves de Azure).
- [ ] Las notificaciones llegan (si no: VAPID y cron).
- [ ] Modo Día/Noche cambia y se recuerda.

## H. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Tras publicar, el navegador pide un archivo que no existe ("Failed to fetch dynamically imported module") | Hay una versión vieja en caché; recargar. Pasa si se abre la app justo durante una actualización |
| Una palabra "se guarda" pero no aparece en Mis palabras | Falta una columna en `user_vocabulary` |
| El test o el nivel parecen incoherentes | Ver `09-decisiones.md` (el test limita el nivel automático) |
| El navegador de pruebas sigue mostrando la versión vieja | Borrar el service worker y las cachés de esa pestaña |
| Vercel bloquea el despliegue | Revisar el correo del autor de los commits (debe ser el `noreply` de GitHub) |
| Un insert en `xp_events` falla | La fuente (`source`) no está permitida por la restricción; ampliar con una migración |

## I. Regenerar la documentación

Los contenidos (`04-contenido/`) y el mapa de archivos se generan leyendo el código y los SQL:

```bash
npm run docs:cierre
```

Genera de nuevo `04-contenido/*`, `03b-mapa-de-archivos.md` y los PDF. Los demás archivos de esta carpeta están escritos a mano y hay que mantenerlos.
