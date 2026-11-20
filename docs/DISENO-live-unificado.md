# Diseño: Live unificado (llamada, tutor y práctica)

Estado: **aprobado por Rodrigo** (2026-11-20). Decisiones: quitar Call, tope de 15 min, Tutor en plan premium, no guardar transcript, español de apoyo para A1 y A2. Se implementa por fases.

**Fase 1: hecha.** Se quitó Call. Live es un solo botón que abre un selector (charla libre, situación o sorpresa). En situación, el coach llama y abre la conversación. Tope de 15 minutos con aviso en los últimos 60 s. Español de apoyo para A1 y A2; B1 en adelante, solo inglés. Pendiente: fases 2, 3 y 4.

## 1. Qué hay hoy (verificado en el código)

Hay dos caminos de voz separados, y eso confunde al usuario:

| Botón | Dónde | Cómo funciona | Limitación |
|---|---|---|---|
| **Call** | `src/pages/Conversation.tsx` (~L514, `startCall`) | Turnos: reconocimiento de voz del navegador → Claude (texto) → TTS. Se envía solo al callarte ~1,8 s (`callMode.ts`, `SILENCE_MS`). | Más lento, un turno detrás del otro, depende del reconocimiento del navegador. |
| **Live (beta)** | `src/components/LiveCall.tsx` + `src/lib/liveSession.ts` | Voz a voz en tiempo real con Gemini Live por WebSocket. La credencial sale de `gemini-tools`. | Solo en idiomas no catalanes y navegadores con soporte (`liveSupported`). Un solo prompt genérico (`liveSystemPrompt`), sin modos. |

Además, `Roleplay.tsx` tiene escenarios de rol (entrevista, reunión…) con texto, y `Chunks`, `Situations`, `Words` y `Mistakes` son páginas separadas de práctica. Nada de eso conversa en vivo.

**Problema de fondo:** cada función es un prompt distinto en una pantalla distinta. El coach no sabe qué hiciste antes en otra parte y el usuario no sabe cuál elegir.

## 2. Propuesta

Una sola experiencia: **Live**. Se entra por un único botón, y antes de conectar se elige el **modo**. Todos los modos usan el mismo motor de voz (Gemini Live), la misma pantalla, el mismo transcript, el mismo cronómetro y el mismo registro de errores.

Se eliminan los botones **Call** y **Live** como dos cosas distintas. El motor de turnos (Call) queda solo como respaldo si el navegador no soporta Live (ver pregunta 1).

### Los tres modos

**A. Llamada (rol libre por situación)**
- La persona que llama es el coach **con un personaje**: un cliente, un recepcionista, un médico, un amigo que propone un plan.
- Quien empieza la conversación es quien llama: el coach abre la llamada con una frase de contexto ("Hi, this is Laura from the dentist's, I'm calling to confirm your appointment…").
- Temas: se toman de `situationsData.ts` y `scenarios.ts`, o el usuario elige uno. Ejemplos: reservar hotel, pedir comida por teléfono, cita médica, llamada de trabajo, reclamo.
- El personaje mantiene su rol aunque el usuario se equivoque; corregir no es su trabajo.
- Termina cuando se cumple el objetivo de la situación o el usuario cuelga. Al cerrar muestra qué logró y qué le costó.

**B. Tutor (clase en vivo)**
- Un profesor que enseña, corrige, interviene y propone ejercicios para hacer juntos.
- Estructura de cada sesión: (1) saludo y pregunta de estado, (2) mini-explicación de un punto (máximo 2 minutos de habla), (3) ejercicio conjunto, (4) corrección y repaso, (5) cierre con resumen de 3 puntos.
- **Método de corrección** (siempre en este orden, sin cortar la frase del usuario):
  1. Si el error no cambia el sentido: *recast* (repite la frase bien, natural, sin señalarlo).
  2. Si se repite el mismo error 3 veces: lo señala en una frase breve y da la regla.
  3. Si es un error de vocabulario o pronunciación: pide que lo repita.
- **Intervención**: el tutor puede interrumpir solo cuando el usuario va en una dirección que produce un error de fondo, nunca por detalles menores.
- **Ejercicios** que se proponen en voz y se muestran en pantalla: completar huecos, transformar frases (pasado, negativo, pregunta), elegir entre dos opciones, repetir con énfasis.
- El tutor toma el nivel de `profile` y los errores recurrentes de `Mistakes` como punto de partida.

**C. Práctica (chunks, phrasal verbs, collocations)**
- El coach **propone** qué practicar, basado en lo que el usuario guardó (`Chunks`, `Words`) y en los errores recientes. No hace falta elegir a mano.
- Ciclo por cada elemento: (1) lo presenta en contexto corto, (2) pide que lo use en una frase propia, (3) lo corrige con el mismo método del tutor, (4) lo vuelve a pedir más tarde en la misma llamada.
- Puede mezclar tipos: un chunk, un phrasal verb, un collocation y una palabra de la semana, en la misma sesión.
- Marca como "usado bien" los que el usuario produjo sin ayuda, y eso alimenta la repetición espaciada que ya existe en `Review`.

## 3. Pantalla

- Antes de conectar: tres tarjetas de modo (Llamada / Tutor / Práctica). En Llamada, además, elegir situación o "sorpresa".
- Durante: avatar o icono del personaje, cronómetro, indicador de quién habla, botón de colgar.
- Panel de transcript plegable. En modo Tutor, un panel de ejercicio (texto + campo opcional para escribir la respuesta si no quiere hablar).
- Al colgar: resumen de la sesión (tiempo, errores corregidos, chunks usados bien, siguiente paso sugerido). Entrega XP como hoy (`awardXp`, tope 20).

## 4. Arquitectura técnica

- **Un solo motor**: `liveSession.ts` recibe un objeto `mode` con `{ kind, prompt, opening, tools }`. Hoy ya acepta `{ level, name, topic }`; se extiende en vez de duplicar.
- **Prompts por modo**: `liveSystemPrompt` pasa a ser `buildLivePrompt(mode, profile, context)` con una plantilla por modo. Los textos de método viven en código (no en la base), como ya se decidió para la lógica de sugerencias.
- **Herramientas de Gemini Live (function calling)**, para registrar lo que pasa en la sesión sin que el usuario haga nada:
  - `log_error({ original, corrected, type })` → escribe en `mistakes`.
  - `log_chunk_used({ chunk, ok })` → actualiza el estado de repaso.
  - `show_exercise({ kind, prompt, items })` → muestra el ejercicio en pantalla.
  - Estas herramientas son la parte que más cambia el resultado. Sin ellas, el tutor "habla" pero no deja rastro.
- **Persistencia**: solo lo necesario (errores, chunks, XP, resumen). El transcript completo no se guarda por defecto (privacidad y costo). Esto se confirma en la pregunta 4.
- **Tipos**: cualquier tabla nueva se tipa en `types.ts` en el mismo commit (regla de memoria de LiderArte/Babelito).
- **Catalán**: queda fuera igual que hoy, porque Live no tiene catalán. Se marca en la UI en vez de ocultar el botón.

## 5. Fases propuestas

1. **Fusión**: un solo botón Live con selector de modo. Modo Llamada con situaciones. Se quita Call, o queda como respaldo oculto. Sin herramientas nuevas todavía.
2. **Modo Tutor**: prompt pedagógico, ejercicios en pantalla.
3. **Modo Práctica**: toma chunks, phrasal verbs y errores de la base.
4. **Herramientas** (`log_error`, `log_chunk_used`) y resumen al colgar con datos reales.

Cada fase se puede probar sola y deja la app funcionando.

## 6. Preguntas para Rodrigo antes de implementar

1. **¿Eliminamos Call?** Recomiendo quitarlo y dejar Live como única opción. Si el navegador no soporta Live, se muestra un mensaje en vez de un respaldo que suena distinto.
2. **¿Límite de tiempo por llamada?** Live cobra por minuto de audio. Propongo un tope de 15 minutos por sesión y un contador visible.
3. **¿Quién paga el tutor avanzado?** Si el modo Tutor queda para premium (la app ya va en esa dirección), o se deja en el plan gratis con tope de tiempo.
4. **¿Guardamos el transcript?** Recomiendo no guardarlo, solo los errores y chunks. Si lo querés guardar, hay que avisarlo en la pantalla.
5. **¿Tutor en español para explicar?** Decidido: explica en inglés, con apoyo en español para **todos los niveles principiantes** (los que son noveles, A1 y A2), y en inglés puro desde B1.

## 7. Fuera de alcance por ahora

- Evaluación de pronunciación dentro de la llamada (ya existe `pronunciation-assess` aparte).
- Video.
- Llamadas en grupo.
