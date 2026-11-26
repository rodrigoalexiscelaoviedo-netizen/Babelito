# Apps de speaking con IA: qué hacen y qué aplicamos (2026-11-26)

Basado en páginas públicas y blogs; **no se probó ninguna app**. Las afirmaciones técnicas son de cada empresa.

## Hallazgos

| App | Lo que aporta | Fuente |
|---|---|---|
| Speak | Con un asistente genérico, cortaba el 27,6 % de las pausas para pensar; configurado como profesor, el 13,6 %. Separa escuchar, juzgar y hablar, y entrenó su propio detector de turnos. Pista al trabarse. Recuerda llamadas anteriores. "Corregir cada imperfección no es buena enseñanza". | [clases en vivo](https://www.speak.com/blog/live-tutor-lessons-powered-by-openais-gpt-live-1) · [arquitectura](https://www.speak.com/blog/the-architecture-behind-ai-tutor-call) · [Tutor Call](https://www.speak.com/blog/your-tutor-is-one-call-away-introducing-ai-tutor-call) |
| Duolingo (Video Call) | Llamada en 4 partes (saludo, primera pregunta, charla, cierre). Lista de datos de la persona para la próxima llamada. No corrige gramática hablando. Personaje 2D en Rive cuyas expresiones reaccionan; la espera se anima para que parezca intencional. | [cómo funciona](https://blog.duolingo.com/ai-and-video-call/) · [animación](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) |
| Praktika | Tutores con avatar. Tono de corrección elegible (suave, equilibrado, estricto) y sugerencias de respuesta. | [web](https://praktika.ai/) |
| Loora | Conversación libre y resumen de la lección; la web no detalla la pantalla. | [web](https://loora.com/) |

## Aplicado

| Idea | Cómo |
|---|---|
| Paciencia en las pausas | `realtimeInputConfig`: A1/A2 1,6 s, B 1,2 s, C 0,9 s. Si el servicio lo rechaza, reintento con configuración básica |
| Ayuda al trabarse | Hint (3 respuestas con español), traducción, repetir, más lento, más simple; se resalta Hint tras 9 s de silencio |
| Corrección elegible | Al final / equilibrada / cada error |
| Objetivo claro | 3 objetivos por situación (`lib/liveGoals.ts`); la IA los marca con `mark_goal` |
| Memoria | Hasta 12 datos, solo de charla libre, sin datos sensibles (por instrucción a la IA); se ven y se borran. `profiles.profile_json.liveMemory` |
| Errores recurrentes | La IA crea ocasiones para usar lo que se repite |
| Cierre | Se despide 45 s antes del límite |
| Diseño | Formato videollamada: recuadro del coach que se mueve con el volumen real de su voz, subtítulos, ayudas, silenciar y colgar |

No aplicado: detector de turnos propio y modelos separados para juzgar (arquitectura de Speak).

## Avatar humano (pendiente de decisión)

El recuadro `components/live/TutorStage.tsx` recibe estado y volumen; el avatar va ahí.

**A. Video de aspecto real (de pago).** Precios de terceros que no coinciden entre sí: desde unos 0,01 hasta 0,37 USD por minuto. Una fuente cita un plan gratis de Anam de 30 min/mes. Requiere cuenta y clave. **Sin verificar** que acepten el audio PCM de Gemini. [comparativa](https://blog.akapulu.com/p/real-time-avatar-api-pricing-index/)

**B. 3D en el navegador (gratis).** [TalkingHead](https://github.com/met4citizen/TalkingHead) (MIT) acepta audio PCM en vivo, pero no deriva los labios de ese audio: hace falta [HeadAudio](https://github.com/met4citizen/HeadAudio) (MIT), cuyo autor dice que la precisión está lejos de ser óptima. El único modelo de ejemplo declarado CC0 es `mpfb.glb`, de 36,8 MB; los livianos tienen licencia no comercial o sin aclarar. Además requiere three.js. No verificado cómo se ve ni que HeadAudio se conecte con el modo en vivo.

**C. Personaje 2D propio.** Es el enfoque de Duolingo. Liviano y sin costo por minuto; depende de conseguir un buen arte.
