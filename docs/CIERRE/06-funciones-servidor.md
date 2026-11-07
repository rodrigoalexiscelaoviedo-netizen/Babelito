# 6. Funciones del servidor (Edge Functions)

Cinco funciones en **Deno**, publicadas en Supabase (`supabase/functions/<nombre>/index.ts`). Su razón de existir: **guardar las claves secretas fuera del navegador** y validar quién llama.

Reglas comunes: reciben `Authorization: Bearer <token de sesión>`, validan al usuario, limitan el tamaño de lo que reciben y aceptan solo el origen de la app (`ALLOWED_ORIGIN`). Una llamada vacía o de sondeo sirve para saber si la función está disponible sin gastar cuota.

| Función | Verify JWT | Qué hace | Gasta cuota del coach |
|---|---|---|---|
| `claude-proxy` | **Sí** | El coach (Gemini) | Sí |
| `gemini-tools` | No (valida la sesión ella misma) | Audio, visión y credencial de Live | Sí |
| `speech-tts` | No (valida la sesión ella misma) | Voz natural (Azure) | No |
| `pronunciation-assess` | No (valida la sesión ella misma) | Puntaje de pronunciación (Azure) | No |
| `send-reminders` | No (usa un secreto del cron) | Recordatorios push | No |

## `claude-proxy`

- **Entrada:** `{ system, messages[], maxTokens, temperature, json }`. Hasta 40 mensajes de 4.000 caracteres y un sistema de 12.000.
- **Proceso:** valida el JWT → descuenta la cuota diaria con `consume_coach_call` → llama a Gemini con el modelo principal `gemini-2.5-flash-lite` y, si está saturado, al de respaldo `gemini-2.5-flash`.
- **Modo JSON:** con `json: true` Gemini responde un JSON válido. Lo usan el diccionario, los ejercicios de errores, el diagnóstico oral, los informes, las historias y las preguntas de lectura.
- **Salida:** `{ text }` o un error con `retryable` si conviene reintentar.
- **Secretos:** `GEMINI_API_KEY`, `COACH_DAILY_LIMIT` (por defecto 300), `ALLOWED_ORIGIN`.

## `gemini-tools`

Tres modos, elegidos con el campo `mode`:

| Modo | Entrada | Salida |
|---|---|---|
| `audio` | Grabación (base64, wav/webm/ogg/mp3/mp4/aac) + `task` (`feedback` con frase de referencia, o `transcribe`) + nivel | Transcripción, frase de ánimo y hasta 3 consejos de pronunciación (en español) |
| `vision` | Foto (jpeg/png/webp) + nivel | Qué es, resumen en inglés simple y español, vocabulario (hasta 8) y frases útiles (3) |
| `live-token` | — | Credencial de **un solo uso** (20 min; sesión nueva en 2 min) para abrir Gemini Live desde el navegador, y el modelo `gemini-2.5-flash-native-audio-preview-09-2025` |

- Un cuerpo `{ "probe": true }` devuelve los modos disponibles sin gastar cuota.
- Para `audio` y `vision` usa `gemini-2.5-flash` (con respaldo `flash-lite`), JSON garantizado, **razonamiento desactivado** (`thinkingBudget: 0`) y un tope de 1.200 tokens de salida. Con el razonamiento activo la respuesta salía cortada.
- Límites: audio ≈ 1,8 MB, imagen ≈ 3 MB.
- **Secretos:** `GEMINI_API_KEY`, `COACH_DAILY_LIMIT`, `ALLOWED_ORIGIN`.
- Toda la interfaz que depende de esta función se oculta sola si no está desplegada.

## `speech-tts`

- **Entrada:** `{ text, voice }`. Voces permitidas: `en-GB-SoniaNeural` (por defecto), `en-GB-RyanNeural`, `en-US-JennyNeural`, `en-US-GuyNeural`, `en-AU-NatashaNeural`, `en-IN-NeerjaNeural` y otras de la lista; el acento se elige en el perfil.
- **Salida:** audio MP3.
- Sin claves de Azure responde **501** y la app usa la voz del navegador.
- **Secretos:** `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (`northeurope`), `ALLOWED_ORIGIN`.

## `pronunciation-assess`

- **Entrada:** audio WAV PCM 16 kHz mono en base64 (hasta ≈ 45 s) y la frase de referencia.
- **Proceso:** llama a Azure Pronunciation Assessment y devuelve su JSON (puntaje global, exactitud, fluidez, completitud y por palabra).
- Un cuerpo vacío sirve de sondeo: `501` = sin Azure, `400` = disponible.
- **Secretos:** `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `ALLOWED_ORIGIN`.

## `send-reminders`

- **Quién la llama:** `pg_cron` cada 15 minutos, con la cabecera `x-cron-secret`.
- **Qué hace:** para cada persona con hora de aviso, calcula su hora local; si está dentro de los 15 minutos desde la hora elegida, todavía no se envió hoy y la práctica del día no está completa, manda un push a todos sus dispositivos. Borra las suscripciones que ya no existen (404/410).
- **Prueba sin enviar:** `x-dry-run: 1` devuelve el resultado sin mandar nada; con `x-force: 1` ignora la ventana horaria y devuelve los textos que se enviarían, sin datos personales.
- **Secretos:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, más `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (los inyecta Supabase).

## Quién usa qué desde la app

| Módulo del cliente | Función |
|---|---|
| `src/lib/claude.ts` | `claude-proxy` |
| `src/lib/geminiTools.ts`, `src/lib/liveSession.ts` | `gemini-tools` |
| `src/lib/naturalVoice.ts`, `src/lib/speech.ts` | `speech-tts` |
| `src/lib/pronunciationAssess.ts` | `pronunciation-assess` |
| `src/lib/notifications.ts` | (guarda la suscripción; el envío lo hace `send-reminders`) |

## Cómo se publican

Las funciones **no** se despliegan con `git push`. Se publican con `supabase functions deploy <nombre>` o pegando el código en el editor de funciones del panel de Supabase. Ver `08-recrear-desde-cero.md`.
