# Funciones nuevas (inglés) — octubre 2026

Todas están ocultas en catalán hasta cerrar la versión en inglés.

| Ruta | Qué es |
|---|---|
| `/plan` | **Mi plan**: tareas de hoy (repaso, conversación, misión, error a corregir, dictado) con estado según tu actividad real, semana de 7 días y metas semanales. La tarjeta de Inicio muestra el avance. |
| `/situations`, `/situations/:id` | **Situaciones**: 18 misiones por temática, 4 pasos (frases+vocabulario → diálogo → quiz → roleplay). Frases al repaso (SRS). +50 XP al completar. |
| `/grammar`, `/grammar/:id` | **Gramática**: 12 lecciones cortas en español ligadas a los tipos de error del coach, con quiz. |
| `/mistakes` | **Mis errores**: ranking del último mes vs el anterior, ejemplos, palabras de pronunciación y ejercicios dirigidos generados por IA. |
| `/dictation` | **Dictado**: escuchar, escribir y corrección palabra por palabra (LCS). |
| Progreso | **Escalera de nivel**: mismos criterios que decide el nivel (repaso, conversación, diagnóstico, umbral 75%) + metas de apoyo. |
| Conversación | Botón **Call**: llamada de voz manos libres. |
| Todo el audio en inglés | **Voz natural** (Azure TTS) con respaldo a la voz del navegador; interruptor en Perfil; botón "Slow". |
| Listen & repeat | **Puntaje real de pronunciación** (Azure). Ver `PRONUNCIACION-AZURE.md`. |
| Recordatorios | Mensaje inteligente: racha ≥3 → repasos pendientes (≥5) → misión a medias → racha corta → frase rotativa. Prueba: `x-dry-run: 1` + `x-force: 1` devuelve los textos sin enviar. |

## Base de datos
- `0006` historias A1 · `0007` XP de Sonidos/Escucha · `0008` `situation_progress` + origen de XP `situation`.
- El progreso de gramática reutiliza `situation_progress` con `pack_id = "grammar:<id>"`.

## Funciones de Supabase (Edge)
`send-reminders`, `pronunciation-assess`, `speech-tts` (sin Verify JWT: validan la sesión ellas mismas) y `claude-proxy`.
Secretos de Azure: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (`northeurope`).

## Gemini (Google AI Studio) — segunda tanda

| Qué | Dónde |
|---|---|
| **JSON garantizado** | `claude-proxy` acepta `json: true` (Gemini responde JSON válido). Lo piden diccionario, ejercicios de errores, diagnóstico oral, feedback de pronunciación, informes e historias. |
| **Feedback de voz con audio** | Botón "Coach feedback on my voice" en Listen & repeat: Gemini escucha la grabación y comenta palabra por palabra. |
| **Photo helper** (`/lens`) | Foto de un menú/cartel/etiqueta → explicación en inglés simple, vocabulario y frases útiles, y todo al repaso. |
| **Diálogos con dos voces** | En Situaciones, el otro personaje habla con una segunda voz neural. |
| **Live (beta)** | Botón "Live" en Conversación: voz a voz en tiempo real con Gemini Live. Credencial de un solo uso desde `gemini-tools`. |

`gemini-tools` (Edge Function, sin Verify JWT): modos `audio`, `vision` y `live-token`; comparte la cuota diaria del coach.
Toda la UI nueva se oculta sola si `gemini-tools` no está desplegada.
Privacidad: en el plan gratuito de la API de Gemini, Google puede usar lo enviado para mejorar sus productos.
