# Funciones de referencia vs. Babelito

Inventario de lo que ofrecen las apps y cursos de referencia, con su enlace, y el estado de cada función dentro de Babelito.

Estados:
- ✅ **Ya está** en Babelito.
- 🟢 **Agregado** en la rama `premium-overhaul` (ver commits).
- 🟡 **Parcial**: existe una versión, le falta la parte principal.
- 🔑 **Requiere** una clave, un costo o una decisión tuya.
- 📚 **Requiere** contenido escrito o verificado por una persona.

## Conversación y speaking

| Función | Referencia | Babelito | Estado |
|---|---|---|---|
| Chat de voz con un tutor IA que corrige y explica | [Duolingo Max — Video Call y Roleplay](https://blog.duolingo.com/duolingo-max), [revisión](https://storylearning.com/duolingo-max-review) | Conversación con el coach (`/conversation`) con corrección estructurada en cada turno | ✅ |
| Escenas de rol con feedback | [Duolingo Max — Roleplay](https://beginnersinai.org/duolingo-max-explained/) | `/roleplay`: escenas de negocios (inglés) y de vida cotidiana catalana (catalán) | ✅ |
| Explicación de por qué una respuesta está mal | Duolingo "Explain my answer" (gratuita desde enero de 2026 según [esta revisión](https://copycatcafe.com/blog/duolingo-max)) | Bloque "Correction / More natural / Key tip" en cada respuesta del coach | ✅ |
| Conversación en tiempo real (sin esperar turnos) | [Duolingo Video Call](https://itiger.com/news/2486308743), [Speak](https://techcrunch.com/?p=2592440) | El modo en vivo se eliminó en esta rama (`live-proxy`). El coach funciona por turnos | 🟡 — ver "Pendiente" |
| Corrección de pronunciación al hablar | [Speak — feedback de pronunciación](https://www.tooliverse.ai/tools/speak) | Compara palabra por palabra con el reconocimiento del navegador (`ShadowingBlock`) | 🟡 — no mide el sonido real |
| Puntaje por fonema con colores | [ELSA Speak](https://www.talkdrill.com/blog/compare/elsa-speak-vs-speechling/) | No | 🔑 Requiere motor acústico (p. ej. Azure Pronunciation Assessment) |
| Lecciones generadas desde tus errores repetidos | [Speak Premium Plus (reseña)](https://neuronfeed.com/reviews/speak-review) | El coach detecta errores y los muestra; no genera lecciones con ellos | 🟡 — ver "Pendiente" |

## Repaso y memoria

| Función | Referencia | Babelito | Estado |
|---|---|---|---|
| Repaso espaciado (SRS) | [Anki](https://apps.ankiweb.net/) | `/review` con SRS propio | ✅ |
| Exportar tarjetas para Anki | [Language Reactor — exportar a Anki](https://languagereactor.com/help/export), [Anki — importar archivos de texto](https://docs.ankiweb.net/importing/text-files.html) | Perfil → "Exporta les targetes a Anki" (archivo `.txt` con cabecera de Anki) | 🟢 |
| Vocabulario con definición y traducción | Duolingo, Anki | Lectura y Stories con diccionario al tocar palabras, caché compartida | ✅ |
| Tarjetas de frase con pista | Anki "Basic (and reversed card)" | Repaso con frase a decir y pista en español | ✅ |

## Contenido

| Función | Referencia | Babelito | Estado |
|---|---|---|---|
| Lectura con diccionario | Language Reactor, Lingq | `/reading` | ✅ |
| Historias con vocabulario | Lingq, Glossika | `/stories` | ✅ |
| Expresiones (chunks) | Glossika (frases en bloque) | `/chunks` | ✅ |
| Práctica de sonidos y entonación | [ELSA](https://www.alllanguageresources.com/elsa-speak/) | `/sounds`, `/listening` | ✅ |
| Corrector de textos libres | Grammarly, Duolingo | `/correct` | ✅ |
| Curso catalán de referencia oficial | Parla.cat, de la Generalitat (12 módulos, 4 niveles). Enlace de búsqueda de terceros: [papelea.com](https://papelea.com/es/generalitat-de-cataluna/curso-de-catalan-en-linea-parla-cat) (verificar en el sitio oficial) | No hay ruta por módulos | 📚 |
| Preparación de certificados oficiales de català | Intercat, organismo de los certificados (enlace oficial pendiente de verificar; la búsqueda solo devolvió la mención). Recurso de la Universitat de Barcelona: [Aprèn llengües](https://www.ub.edu/aprenllengues/es/node/1723) | No | 📚 + 🔑 (requiere el formato real del examen verificado) |
| Vocabulario catalán con tests | [Catalan 90000 Words](https://apps.apple.com/app/id1535799294) | `/chunks` y `/review` | ✅ parcial |
| Frases utilitarias para hablar | [Lentil](https://apps.apple.com/app/id1455733682) | Práctica del día con expresiones | ✅ |

## Hábito y producto

| Función | Referencia | Babelito | Estado |
|---|---|---|---|
| Racha y práctica diaria | Duolingo | Racha con congelaciones, práctica del día | ✅ |
| Recordatorios | Duolingo | Web Push desde el servidor (requiere configurar VAPID y el cron) | 🔑 Ver [docs/RECORDATORIOS.md](RECORDATORIOS.md) |
| Logros | Duolingo | `/progress` | ✅ |
| Ligas y XP | Duolingo | No | Decisión de producto (¿lo querés?) |
| Modo sin conexión | Duolingo, Anki | Solo la app; sin caché offline del contenido | 🟡 — ver "Pendiente" |
| Analítica de uso | Amplitude, PostHog | Sentry (errores), sin analítica de producto | 🟡 |

## Pendiente, por orden de valor

1. **Lecciones desde tus errores repetidos.** Es código, no requiere claves. Tomaría los errores de `errors` que más se repiten y arma una sesión de práctica con ellos. *Lo puedo hacer ahora.*
2. **Pronunciación real por fonema.** Requiere un motor acústico y una clave de Azure (o similar). *Tu decisión: ¿aceptás el costo por uso?*
3. **Conversación en tiempo real.** Hay que volver a crear el proxy WebSocket con una versión segura (sin JWT en la URL). *Lo puedo hacer; cuesta más que el resto.*
4. **Ruta de cursos por módulos.** Un currículo tipo Parla.cat, con progreso por módulo. *Requiere que vos definas los módulos y yo los armo.*
5. **Modo sin conexión.** Caché del contenido con `vite-plugin-pwa`. *Lo puedo hacer.*
6. **Preparación de certificados de català.** Requiere el formato y los criterios oficiales, verificados en Intercat y en Parla.cat (enlaces oficiales por confirmar). *Necesita contenido y verificación tuya.*
7. **Ligas y XP.** *Decisión de producto.*

## Notas sobre las fuentes

- Los datos de Duolingo, Speak y ELSA vienen de búsquedas web y de reseñas de terceros; no de documentación oficial. Los precios y las funciones cambian: confirmalos en cada app antes de decidir.
- Los enlaces de Anki (`apps.ankiweb.net`, `docs.ankiweb.net`) son las páginas oficiales conocidas, pero no los abrí en esta sesión: revisalos.
- DELE es el certificado de español del Instituto Cervantes, no de catalán. Los certificados de catalán son otros.
