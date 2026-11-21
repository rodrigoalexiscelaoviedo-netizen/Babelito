# Diseño: shadowing y lectura de noticias

Estado: propuesta aprobada en las decisiones (ver abajo). Pendiente de implementar.

## Decisiones tomadas

1. **Shadowing dentro del lector** (noticias y Stories), no en Dictado.
2. **Noticias en original, con ayuda**: el texto es el original (con link a la fuente); la ayuda se ofrece al tocar palabras, en audio y en la versión por oración.
3. **El shadowing cuenta para el nivel de habla solo cuando el puntaje funciona bien.** Hasta entonces es práctica sin efecto en el nivel.

## Por qué shadowing va en el lector y no en Dictado

- Dictado entrena escribir lo que oís (oído y ortografía).
- Shadowing entrena hablar: ritmo, entonación y sonidos.
- El lector ya tiene el texto y el audio sincronizados: es el lugar natural para repetir oración por oración.

## Cómo funciona el shadowing (versión propia)

Por oración:
1. Escuchar el modelo (velocidad normal o lenta).
2. Repetir en voz alta. Se graba el intento.
3. Feedback en tres niveles: **bien**, **regular**, **a repetir**. Sin marcar "palabra incorrecta" salvo que el puntaje sea claro.
4. Botón para escuchar tu grabación al lado de la original.
5. Opción **"no estoy seguro"**: no cuenta como error ni baja el puntaje.

Controles: repetir oración, loop A-B para un tramo, velocidad lenta, siguiente.

Puntaje por oración (no por palabra): el reconocimiento de voz falla justo en palabras sueltas, y eso generaría correcciones injustas.

Reutiliza `ShadowingBlock` y el puntaje de pronunciación ya existentes (`pronunciationAssess`).

## Condición para que cuente en el nivel

El shadowing entra al cálculo de nivel de habla solo si se cumplen los tres:
- La evaluación está disponible (servicio de pronunciación activo).
- Hay al menos 5 intentos válidos en 14 días (mismo mínimo que `MIN_SKILL_ATTEMPTS`).
- El puntaje de cada intento se guardó sin error.

Mientras no se cumplan, la pantalla muestra "práctica: todavía no cuenta para tu nivel".

Se valida con uso real antes de activarlo: revisar en producción que los puntajes tengan sentido en 2-3 sesiones de prueba.

## Lector de noticias (carril nuevo)

Dentro de Learn > "Listen & read":
- **Stories** (hoy) y **Reading** (hoy) se mantienen como biblioteca graduada.
- **Noticias del día** se suma como carril. Cada nota muestra: titular, fuente, fecha, enlace original.

Contenido:
- Texto original, no reproducido completo en la app si la fuente no lo permite: mostrar el extracto o resumen, con enlace.
- Ayuda al tocar palabra: traducción, guardar en "Mis palabras", audio de la palabra.
- Versión por oración para practicar (ver shadowing).
- Chequeo rápido de comprensión: 3 preguntas, como Reading.

### Categorías de fuentes pedidas

| Categoría | Qué sería en la app | Viabilidad | Riesgo |
|---|---|---|---|
| **IA** (novedades, cómo usarla mejor, código, repos) | Lectura: nota resumida + ejemplo de código + enlace | Alta. Los releases de GitHub tienen feed Atom oficial (`/releases.atom`). El blog de Anthropic no tiene feed oficial; hay feeds de terceros no confiables como única fuente | Bajo. Se puede citar el código de ejemplo con su licencia |
| **Mundo** (Infobae internacional) | Lectura: titular + resumen propio + enlace | Media. Hay feeds en `infobae.com/arc/outboundfeeds/`, pero no encontré términos que permitan republicar | Medio: sin confirmar términos, solo titular y enlace |
| **Inversiones** (Investing.com) | Lectura: titular + resumen propio + enlace | Media. Hay feeds, pero los términos de reuso no se pudieron confirmar | Medio: mismo criterio que Infobae |
| **Shows de techno y progressive** | Escucha: episodio + transcripción generada | Media. Son audio (Techno Live Sets, Viva La Tech, Juicebox Radio tienen feed), sin transcripción oficial | Bajo en licencia para enlazar; la transcripción propia puede tener errores |

Reglas comunes:
- Nunca se reproduce el artículo completo. Se muestra un resumen propio, el titular y el enlace original.
- Cada nota tiene fuente, fecha y enlace visibles.
- Los feeds de terceros (agregadores, generadores) no se usan como fuente principal.

**Recomendación de orden:** IA primero (más útil para vos y el riesgo es más bajo), después Mundo e Inversiones con términos confirmados, y shows de techno al final porque requieren transcribir el audio.

**No se publica ninguna fuente hasta confirmar sus términos y tu visto bueno por cada una.**

Referencias de otras apps: [Readlang](https://readlang.com/) (tocar para traducir en cualquier web, cada búsqueda queda como flashcard), [LingQ](https://apps.apple.com/us/app/lingq-learn-languages/id379385811) (lectura + escucha + vocabulario), [Language Reactor](https://jalt-publications.org/articles/28605-enhancing-functionality-youtube-and-netflix-language-reactor) (pausa por línea para repetir).

## Fases propuestas

- **Fase 1:** shadowing por oración dentro de Stories (contenido propio, ya existe). Feedback en tres niveles y "no estoy seguro". Sin efecto en el nivel.
- **Fase 2:** carril de noticias con fuente aprobada, texto original con enlace, tocar palabra y audio.
- **Fase 3:** shadowing en noticias y en Listening; activar conteo para el nivel cuando el puntaje esté validado.
- **Después (no decidido):** videos con subtítulos dobles. Subtítulos automáticos son poco confiables; se evalúa más adelante.

## Preguntas abiertas

1. ¿Ok con empezar por IA (GitHub releases y notas técnicas) en el carril de noticias?
2. ¿Infobae e Investing los querés con titular y resumen propio, sabiendo que los términos no están confirmados?
3. ¿Ok con empezar por la Fase 1 en Stories?
