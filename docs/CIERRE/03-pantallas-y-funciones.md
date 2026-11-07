# 3. Pantallas y funciones

## Menú: cuatro puertas

El menú agrupa las herramientas por lo que la persona quiere **hacer**, no por cómo están construidas (`src/lib/hubs.ts`, `src/pages/Hub.tsx`). Cada puerta tiene su color: Speak naranja, Learn azul, Remember verde, Me dorado. En celular es una barra inferior de 5 pestañas (Inicio + 4 puertas); en escritorio, un menú lateral que despliega las herramientas de la puerta activa.

| Puerta | Herramientas | Para qué |
|---|---|---|
| **Speak** | Talk to your coach · Situations · Roleplay · Pronunciation · Fix my writing | Practicar hablando y escribiendo |
| **Learn** | Stories · Reading · Listening · Dictation · Photo helper | Absorber inglés con contenido |
| **Remember** | Daily review · My words · Phrase library · Grammar · My mistakes | Que lo aprendido se quede |
| **Me** | Progress & level · My plan · Profile & settings | Ver el avance y ajustar |

Remember muestra tres números reales: repasos de hoy, palabras en práctica y palabras que ya sabés.

## Todas las rutas

| Ruta | Pantalla | Qué hace |
|---|---|---|
| `/login` | Login | Ingreso y registro |
| `/onboarding` | Onboarding | Idioma, objetivo, nivel auto-percibido, intereses |
| `/diagnostic` | Test de nivel | Ver sección "Test de nivel" |
| `/` | Inicio | Saludo, tarjeta "Up next", práctica del día, racha, nivel, XP |
| `/speak` `/learn` `/remember` `/me` | Puertas | Herramienta principal grande + el resto como tarjetas |
| `/conversation` | Conversación | Chat de voz o texto con el coach; botones **Call** (manos libres) y **Live** (voz a voz, beta) |
| `/situations`, `/situations/:id` | Situaciones | 18 misiones de 4 pasos |
| `/roleplay` | Roleplay | Escenas (entrevista, reunión, llamada…) con el coach actuando un rol |
| `/sounds` | Pronunciación | Sonidos difíciles para hispanohablantes, pares mínimos, repetir y puntuar |
| `/correct` | Corrector | Pegás un correo o mensaje y lo corrige con explicación |
| `/stories` | Historias | 25 historias en inglés con filtros por nivel y tema, lectura con palabras tocables y preguntas |
| `/reading` | Lectura | 6 textos o uno propio; palabras y frases tocables; cierre con comprensión |
| `/listening` | Escucha | Patrones de habla conectada y entrenamiento de oído |
| `/dictation` | Dictado | Escuchar, escribir y ver la comparación palabra por palabra |
| `/lens` | Photo helper | Foto de un menú o cartel → explicación, vocabulario y frases |
| `/review` | Repaso diario | Sesión de 12 tarjetas del SRS |
| `/words` | Mis palabras | Buscar, escuchar, cambiar estado y borrar palabras guardadas |
| `/chunks` | Biblioteca de frases | Expresiones por categoría, para repasar |
| `/grammar`, `/grammar/:id` | Gramática | 12 lecciones cortas con quiz |
| `/mistakes` | Mis errores | Ranking de errores recurrentes y ejercicios hechos para vos |
| `/plan` | Mi plan | Tareas de hoy, semana de 7 días y metas semanales |
| `/progress` | Progreso | Escalera de nivel, racha, XP, informes de sesión, logros |
| `/profile` | Perfil | Nombre, voz, acento, recordatorios, idioma, modo Día/Noche, exportar a Anki, repetir el test |
| `/dev/ui` | Galería de componentes | Solo para desarrollo |

## Lectura interactiva (Reading y Stories)

1. Se lee el texto. Dos modos: **Words** y **Sentences**.
2. **Tocar una palabra**: se oye y aparece una tarjeta con la **traducción corta** (1 a 3 equivalentes), la categoría gramatical, **un ejemplo traducido** y hasta **2 usos habituales** (verbos con partícula, expresiones). Una sola acción: **Practise this word** (o "I know it").
3. **Tocar una frase**: se oye; la tarjeta da la traducción, hasta 2 expresiones para aprender de ella y tres botones: Listen, **Say it** (se practica con micrófono) y Practise.
4. "Practise" guarda la palabra o frase en **Mis palabras** y la manda al **repaso** (con su traducción como ayuda).
5. Al final aparece **"Lock it in: a 1-minute check"**: 3 preguntas de comprensión generadas por el coach (se guardan en el navegador) → repaso por tarjeta de las palabras guardadas ("Show the meaning" → "I remembered it / Not yet") → resumen con XP y botones "Review my words" / "Read another text".
6. XP del cierre: 10 + 5 por pregunta acertada + 2 por palabra recordada (una vez por texto y día).

## Repaso diario (SRS)

Sesión de **12 tarjetas**. El tipo de ejercicio depende de cuántas veces se acertó el ítem (`reviewCards.ts`):

| Veces acertada | Ejercicio |
|---|---|
| 0 | **Meet** — tarjeta nueva: audio, definición y ejemplo en inglés |
| 1 | **Listen** — elegir lo que se escuchó |
| 2 | **Gap** — completar el hueco (in/on/at, a/an/the…) o escuchar |
| 3 o más | Palabras: escuchar o decir; frases: hueco o **decirlo en voz alta** con puntaje |

- Las opciones falsas salen de tu propio mazo y de las frases de Situaciones; hay grupos de palabras que se confunden a propósito (in/on/at, a/an/the…).
- Lo que se falla vuelve una vez más en la misma sesión.
- El español solo aparece al tocar **"Need the Spanish?"**.
- Una llamada a la IA por sesión trae definiciones y ejemplos; se guarda en el navegador.
- **Reglas del SRS** (`srs.ts`): si recordás, el intervalo pasa a 1 día, luego 3 días y después `intervalo × facilidad`; la facilidad sube 0,1 hasta 2,8. Si fallás, vuelve a 1 día y la facilidad baja 0,15 (mínimo 1,3).

## Test de nivel

Detalle de preguntas en `04-contenido/02-test-de-nivel.md`.

1. **Escrito:** 26 preguntas (5 por nivel más una), de A1 a C1, con botón "I don't know". Al cerrar un nivel con menos de 60 % de aciertos, se corta.
2. **Segunda oportunidad:** si un nivel queda justo en 2 de 5, se agregan 3 preguntas de desempate de ese nivel y se decide con las 8 (5 de 8).
3. **Oral** (si hay micrófono y no es principiante): lectura en voz alta de 3 frases (puntaje = palabras acertadas) y una pregunta abierta personalizada por tus intereses (la evalúa el coach).
4. **Resultado:** el nivel escrito es el ancla; lo oral lo mueve como máximo un escalón. Se puede elegir el nivel a mano.

## Nivel (cómo cambia solo)

Todos los días `leveling.ts` evalúa la evidencia reciente y puede mover el nivel un escalón:

- **Puntaje** = 60 % fuerza del repaso + 30 % precisión en conversación + 10 % test.
- **Sube** con puntaje ≥ 0,75; **baja** con ≤ 0,35. Hacen falta al menos 3 sesiones en 7 días.
- **Límites:** no sube más de 2 escalones sobre el nivel diagnosticado ni baja más de 1 bajo él.
- Cada cambio se guarda en `level_history`. La **escalera de nivel** de `/progress` muestra la misma evidencia (umbral 75 %) más metas de apoyo.

> Consecuencia importante: un test mal medido limita el nivel automático. Ver `09-decisiones.md`.

## Práctica del día y racha

- **Práctica del día** (`dailyLesson.ts`): tres ítems — *expresión del día* (decirla 3 veces), *mini-conversación* sobre un tema y *palabra del día* (no cuenta aún para completar). Completarla suma +25 XP y mantiene la **racha**.
- **Racha:** días seguidos con práctica. Hay **2 congelaciones al mes** que protegen un día perdido.
- Una conversación solo cuenta como práctica si la persona habló **al menos 3 veces** (`practice.ts`).
- **Up next** (en Inicio): la tarjeta abre directamente la próxima tarea de *Mi plan*.

## Mi plan

Tareas de hoy derivadas de la actividad real (`plan.ts`): repaso pendiente, una conversación, la misión de Situaciones a medias, el error más frecuente a corregir y un dictado. Más una semana de 7 días y metas semanales (5 días practicados, 3 conversaciones/roleplays, 20 repasos, 1 misión).

## XP y niveles de experiencia

| Actividad | XP |
|---|---|
| Conversación o roleplay | hasta 40 + esfuerzo (5 por turno, tope 40, × calidad; +1 por minuto, tope 15) |
| Historia completa | 30 + hasta 30 según comprensión (solo la primera vez) |
| Cierre de lectura | 10 + 5 por pregunta + 2 por palabra |
| Repaso | 3 si la recordaste, 1 si la fallaste |
| Práctica del día completa | 25 |
| Situación completa | 50 |
| Sonidos | 2 por par mínimo acertado (una vez por par y día) |
| Escucha | 10 por sesión + 2 por acierto |
| Dictado | 8 + promedio/10 (si el promedio es ≥ 50 %) |

El nivel de experiencia 1 pide 100 XP y cada uno suma 25 más. Títulos: Curious → Explorer (5) → Storyteller (10) → Conversationalist (20) → Fluent Mind (35). La **calidad** de una conversación baja hasta 0,6 si hay muchos errores. Cada actividad tiene clave única, así que no se cuenta dos veces.

## El coach

- Corrige **como máximo 2 errores por turno** y elogia lo que está bien.
- Estructura de cada respuesta: charla, `---FEEDBACK---` y secciones *Correction / More natural / Key tip*.
- Abre con una frase fija por tema y nivel (sin gastar IA).
- Detecta tipos de error (`errorTypes.ts`) que alimentan *Mis errores*, *Gramática* y *Mi plan*.
- Al terminar una sesión genera un **informe** (resumen, lo bien hecho, errores clave, frases sugeridas).
- Si la sesión queda a medias, ofrece **retomarla** durante 48 horas.

## Voz

- **Voz natural** (Azure) para todo el inglés; interruptor en Perfil; botón "Slow".
- **Listen & repeat:** puntaje de pronunciación real (global, exactitud, fluidez, completitud y color por palabra) y comentario hablado opcional del coach.
- **Call:** llamada manos libres; detecta cuándo terminaste de hablar por el silencio.
- **Live (beta):** conversación voz a voz en tiempo real con Gemini Live.

## Recordatorios

Notificación diaria a la hora elegida (hora local de la persona), una vez por día y solo si la práctica no está hecha. El mensaje es inteligente: racha ≥ 3 en riesgo → repasos pendientes (≥ 5) → misión a medias → racha corta → frase motivacional rotativa. En iPhone solo funciona con la app instalada (iOS 16.4+).

## Otras funciones

- **Exportar a Anki:** las tarjetas del repaso se bajan como `.txt` listo para importar.
- **Logros:** 8 (primera conversación, primera historia, primer repaso oral, 10 intentos de pronunciación, 50 palabras y rachas de 7, 30 y 100 días; ver `04-contenido/06-roleplay-temas-y-frases.md`).
- **Botón "atrás":** el del navegador o del celular cierra la vista interna (lector, detalle, práctica) en vez de salir de la página (`useHistoryBack.ts`).
- **Sesiones guardadas turno a turno:** si salís de una conversación o roleplay a mitad, al volver ofrece continuarla (48 h).
- **Modo Día / Noche:** botón en el menú lateral y en Perfil; se recuerda en el dispositivo.
- **Catalán (pausado):** el código y el contenido existen, pero la mayoría de las herramientas nuevas se ocultan en catalán hasta cerrar la versión en inglés.
