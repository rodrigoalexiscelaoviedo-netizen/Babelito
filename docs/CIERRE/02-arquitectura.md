# 2. Arquitectura

## Vista de conjunto

```
 Navegador / app instalada (PWA)
 ├─ React + TypeScript + Tailwind        ← interfaz
 ├─ Web Speech API                       ← micrófono y voz de respaldo
 └─ Service worker (src/sw.ts)           ← caché y notificaciones push
        │  HTTPS
        ▼
 Supabase
 ├─ Auth                                  ← cuentas y sesiones
 ├─ Postgres (+ RLS)                      ← datos; cada fila es de su dueño
 ├─ Edge Functions (Deno)                 ← lo que necesita claves secretas
 │    claude-proxy · gemini-tools · speech-tts · pronunciation-assess · send-reminders
 └─ pg_cron                               ← dispara los recordatorios cada 15 min
        │
        ▼
 Servicios externos: Google Gemini · Azure Speech · Web Push (VAPID)

 Vercel                                    ← publica el frontend al hacer push a `main`
 Sentry                                    ← errores en producción (opcional)
```

**Principio de seguridad:** ninguna clave secreta llega al navegador. El navegador solo conoce la URL de Supabase y la clave pública (anon). Todo lo que usa Gemini o Azure pasa por una función del servidor que primero valida la sesión.

## Tecnologías

| Capa | Tecnología | Para qué |
|---|---|---|
| Interfaz | React 18, TypeScript, Vite 5 | Pantallas y componentes |
| Estilos | Tailwind CSS 3 + variables CSS | Diseño; temas Día y Noche |
| Rutas | React Router 7 | Navegación; todas las pantallas se cargan por demanda |
| Idiomas de la interfaz | i18next | Textos en inglés y catalán con las mismas claves |
| Íconos y tipografías | lucide-react; Bricolage Grotesque, Inter, JetBrains Mono (self-hosted) | Visual |
| Datos | Supabase (Postgres, Auth, Edge Functions, pg_cron) | Backend |
| IA | Google Gemini 2.5 (flash-lite, flash, native-audio) | Coach, correcciones, ejercicios, voz y visión |
| Voz | Azure Speech (voz neural y puntaje de pronunciación) + Web Speech API | Escuchar y hablar |
| Notificaciones | Web Push (VAPID) | Recordatorios |
| PWA | vite-plugin-pwa (`injectManifest`) | Instalable y con caché |
| Errores | Sentry (opcional) | Monitoreo |
| Pruebas | Vitest, Testing Library, Playwright | Calidad |
| Publicación | Vercel (frontend) y Supabase (base y funciones) | Hosting |

## Estructura de carpetas

```
src/
├─ pages/        una pantalla por módulo (26)
├─ components/   piezas compartidas: menú, tarjetas de palabra, cierre de lectura, voz, gráficos…
├─ lib/          la lógica y los datos: repaso, nivel, XP, coach, voz, contenido (≈60 archivos)
├─ context/      AuthContext: sesión y perfil
├─ i18n/         textos de la interfaz (en.ts, ca.ts)
├─ __tests__/    206 pruebas
└─ sw.ts         service worker
supabase/
├─ functions/    5 funciones (ver 06-funciones-servidor.md)
├─ migrations/   8 migraciones SQL (0001–0008)
└─ seeds_stories.sql
public/          íconos, manifest.json, live-worklet.js, theme-init.js
scripts/seed/    carga del contenido catalán
e2e/             prueba de extremo a extremo (catalán)
```

El detalle archivo por archivo está en `03b-mapa-de-archivos.md`.

## Flujos técnicos clave

### Cómo habla el coach
1. La pantalla arma el mensaje con `buildSystemPrompt.ts` (reglas del coach, nivel, errores recientes, tema).
2. `claude.ts` lo manda a la función `claude-proxy` con el token de la sesión.
3. La función verifica la sesión, descuenta de la cuota diaria (`consume_coach_call`), llama a Gemini (modelo `flash-lite`; si falla, `flash`) y devuelve el texto.
4. La respuesta trae la charla y, después de `---FEEDBACK---`, la corrección en secciones; `coachFormat.ts` las separa para mostrarlas en `CoachFeedback`.
5. Los módulos que necesitan datos estructurados piden `json: true` y Gemini responde JSON válido.

### Cómo suena y cómo se evalúa la voz
- **Escuchar:** `speech.ts` pide audio a `speech-tts` (voz neural de Azure, con caché en memoria). Si no está disponible, usa la voz del navegador.
- **Hablar:** `useSpeechCapture.ts` usa el reconocimiento del navegador (único lugar donde se crea). `ShadowingBlock` además graba el audio y lo manda a `pronunciation-assess` para un puntaje real por palabra, y a `gemini-tools` (modo `audio`) para un comentario hablado.
- **Conversación en tiempo real (beta):** `liveSession.ts` pide a `gemini-tools` una credencial de un solo uso y abre un WebSocket directo con Gemini Live; el audio se captura con `public/live-worklet.js`.

### Cómo se guarda lo que aprendés
- **Palabras** (`user_vocabulary`) y **frases/palabras para repasar** (`review_items`) se crean al tocar "Practise" en una palabra o frase.
- El repaso usa un SRS tipo SM-2 simplificado (`srs.ts`).
- Cada actividad que da XP registra un evento con una clave única (`xp_events.ref_key`), así un doble clic no suma dos veces.

### Cómo se decide tu nivel
Ver `03-pantallas-y-funciones.md`, sección "Nivel".

## Seguridad aplicada

- **RLS** (seguridad por fila) en todas las tablas: cada persona solo ve lo suyo. `coach_usage` no tiene políticas: solo la función de la cuota la toca.
- **Cabeceras** en `vercel.json`: HSTS, CSP estricta (`script-src 'self'`; `connect-src` limitado a Supabase, Gemini Live y Sentry), `X-Frame-Options: DENY`, permiso de micrófono solo para la app.
- **Funciones**: validan el JWT, limitan el tamaño de lo que reciben y restringen el origen (`ALLOWED_ORIGIN`).
- Se eliminó un proxy anterior de WebSocket porque el JWT viajaba en la URL y quedaba en los registros.

## Rendimiento

- Todas las pantallas se cargan por demanda (lazy) y las librerías pesadas van en paquetes separados.
- Las definiciones de palabras se guardan en una caché compartida (`word_definitions`): cada palabra se consulta a la IA una sola vez para todos los usuarios.
- Las preguntas de lectura y las definiciones del repaso se guardan en el navegador para no repetir llamadas.
