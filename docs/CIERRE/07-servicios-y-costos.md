# 7. Servicios externos y costos

Nunca se guardan claves en este documento ni en el código. Aquí solo se listan **qué servicios se usan, para qué, y qué límites tienen**. Los precios y cupos cambian: verificarlos en cada portal antes de decidir.

## Resumen

| Servicio | Para qué | Plan usado | Costo al cierre |
|---|---|---|---|
| **Supabase** | Base de datos, cuentas, funciones del servidor, tareas programadas | Gratuito | 0 |
| **Vercel** | Publicar el frontend | Gratuito (Hobby) | 0 |
| **Google Gemini** (AI Studio) | Coach, correcciones, ejercicios, voz y visión | Nivel gratuito de la API | 0 (con cupo) |
| **Azure Speech** | Voz natural y puntaje de pronunciación | Recurso F0 (gratuito) en una cuenta con crédito de prueba | 0 (con cupo) |
| **GitHub** | Código | Gratuito | 0 |
| **Sentry** | Errores en producción | Opcional; no configurado necesariamente | 0 |
| **Web Push (VAPID)** | Notificaciones | Estándar del navegador | 0 |

## Supabase

- Proyecto **Babelito** (`gxmarhrrvhjtpzvaqoll`), organización "APPS".
- Usa: Postgres, Auth, Edge Functions, `pg_cron`, `pg_net` y Vault (para el secreto del cron).
- Plan gratuito: los proyectos inactivos pueden pausarse; hay límites de almacenamiento, de usuarios activos y de invocaciones de funciones.
- Las **claves**: en el navegador solo va la `anon`/publishable. La `service_role` jamás sale del servidor.

## Vercel

- Proyecto `babelito`; despliega automáticamente cada push a `main` en `https://babelito.vercel.app`.
- Variables de entorno: ver `08-recrear-desde-cero.md`.
- Ojo con la identidad de los commits: el correo del autor debe ser el `noreply` de GitHub, o Vercel puede bloquear el despliegue.

## Google Gemini

- Se usa a través de la API de **Google AI Studio** con una clave guardada como secreto en Supabase (`GEMINI_API_KEY`).
- Modelos: `gemini-2.5-flash-lite` (coach, principal), `gemini-2.5-flash` (respaldo y herramientas de audio/visión), `gemini-2.5-flash-native-audio-preview-09-2025` (Live).
- **Cupo**: el nivel gratuito tiene límites por minuto y por día (el código asume del orden de 15 por minuto y 1.000 por día para `flash-lite`). La app añade su propia **cuota por persona**: 300 llamadas al coach por día (`COACH_DAILY_LIMIT`).
- Si se supera el cupo gratuito, la API responde error y la app muestra "El coach no está disponible"; no genera cobros mientras no se active facturación.
- **Privacidad:** en el nivel gratuito, Google puede usar lo enviado para mejorar sus productos. Conviene saberlo antes de abrir la app a más gente.
- Live es una **vista previa** (modelo `preview`): puede cambiar o dejar de existir.

## Azure Speech

- Recurso **Speech**, plan **F0** (gratuito), región `northeurope`.
- Se usa para: voz neural en inglés (`speech-tts`) y puntaje de pronunciación (`pronunciation-assess`).
- El cupo gratuito es mensual y limitado (del orden de 0,5 millones de caracteres de voz y 5 horas de audio evaluado); verificar las cifras vigentes en el portal.
- **Cuenta:** se creó con crédito de prueba que **vence cerca del 27 de noviembre de 2026**. El recurso F0 es gratuito aun después, pero conviene confirmar en el portal de Azure que la cuenta no pasa a un plan de pago y que no hay otros recursos con costo.
- Sin las claves, la app sigue funcionando con la voz del navegador y la comparación de texto.

## Notificaciones (Web Push)

- Usa el estándar del navegador con claves **VAPID** (generadas una vez). No tiene costo.
- Android y escritorio funcionan directo; en iPhone solo con la app instalada en la pantalla de inicio.

## Sentry (opcional)

Se activa solo si existe `VITE_SENTRY_DSN`. Registra errores del navegador.

## Qué dejaría de funcionar si falta cada servicio

| Falta… | Efecto |
|---|---|
| Supabase | La app no puede iniciar sesión ni guardar nada |
| Gemini | Sin coach, sin correcciones, sin ejercicios generados, sin diccionario nuevo, sin preguntas de lectura (el contenido fijo sigue) |
| Azure | La voz vuelve a la del navegador; no hay puntaje real de pronunciación |
| Vercel | No hay frontend publicado |
| pg_cron / VAPID | No hay recordatorios |
| Sentry | Nada visible; solo se pierde el registro de errores |
