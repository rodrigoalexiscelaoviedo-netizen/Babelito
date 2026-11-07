# Mapa de archivos

Cada archivo del proyecto con su propósito, tomado de los comentarios del propio código. Generado automáticamente en el cierre.

## Pantallas (`src/pages`)

| Archivo | Para qué sirve |
|---|---|
| `src/pages/Chunks.tsx` | Biblioteca de expresiones por categoría; permite agregarlas al repaso y practicarlas en voz alta. |
| `src/pages/Conversation.tsx` | Support pre-seeded topic from Dashboard daily lesson Report state Conversación abierta que se puede retomar (turnos guardados en sessions.messages). |
| `src/pages/Correction.tsx` | registramos la sesión + errores para que alimenten el progreso |
| `src/pages/Dashboard.tsx` | Re-leveling: una consolidación por día al entrar a Inicio (ver lib/leveling.ts). Los tildes se DERIVAN de la fila de hoy — sin estado local paralelo. Vista de lectura: NUNCA consumir freezes al… |
| `src/pages/DevGallery.tsx` | Galería de componentes para desarrollo (/dev/ui). No se muestra en producción. |
| `src/pages/Diagnostic.tsx` | ── Voice waveform — shown while SpeechRecognition is active ──────────────── ── Manual level picker — lista de niveles A1..C1 ─────────────────────────── ── Human-readable voice error messages… |
| `src/pages/Dictation.tsx` | Una ronda nueva solo cuando se pide; el nivel no debe re-sortear a mitad. eslint-disable-next-line react-hooks/exhaustive-deps Frases falladas en esta ronda y cuáles ya se mandaron al Repaso. |
| `src/pages/Grammar.tsx` | Lista de lecciones de gramática por nivel, con el progreso de cada una. |
| `src/pages/GrammarLesson.tsx` | Preguntas nuevas solo al reintentar. eslint-disable-next-line react-hooks/exhaustive-deps |
| `src/pages/Hub.tsx` | Pantalla de cada una de las 4 puertas (Hablar, Aprender, Recordar, Yo): herramienta principal grande y el resto como tarjetas. En Recordar muestra números reales. |
| `src/pages/Lens.tsx` | Photo helper: foto de un menú o cartel → explicación en inglés simple, vocabulario y frases útiles (usa Gemini visión). |
| `src/pages/Listening.tsx` | Rate for native-speed playback The train-my-ear quiz needs a consistent { written, spoken, distractors } shape. catalanListeningPatterns.ts has inconsistent per-entry exercise |
| `src/pages/Login.tsx` | Ingreso y registro con correo y contraseña. |
| `src/pages/Mistakes.tsx` | Mis errores: ranking de errores recurrentes, ejemplos, palabras de pronunciación y ejercicios generados por IA. |
| `src/pages/Onboarding.tsx` | Sin default silencioso: el usuario DEBE elegir idioma explícitamente. (Antes arrancaba en "en" y se podía pasar el paso sin tocar nada → quedaba en inglés sin querer. Fue el bug que encerró a… |
| `src/pages/Plan.tsx` | Mi plan: tareas de hoy según tu actividad real, semana de 7 días y metas semanales. |
| `src/pages/Profile.tsx` | Notification settings Voice settings Hora local del dispositivo: el cron de recordatorios la usa para disparar a la hora correcta. |
| `src/pages/Progress.tsx` | ── Animated counter ───────────────────────────────────────────────────────── ── SVG ring ───────────────────────────────────────────────────────────────── ── Ring stat card… |
| `src/pages/Reading.tsx` | READING_TEXTS is English-only content, regardless of learning_language Las palabras que la persona decide practicar en esta lectura se repasan al cerrarla. |
| `src/pages/Review.tsx` | Definiciones y ejemplos en inglés: se esperan unos segundos como máximo. Segunda oportunidad al final de la sesión. ── Tarjetas ───────────────────────────────────────────────────────────────────── |
| `src/pages/Roleplay.tsx` | Si se llega desde una Situación, el escenario y su id vienen en el estado de la ruta. Roleplay a medias (turnos guardados en sessions.messages). Se identifica el escenario por su título. Guard en… |
| `src/pages/SituationDetail.tsx` | Cortar el audio al salir de la pantalla. Optimista: se ve al instante; la base confirma después. ── Paso 1: frases y vocabulario ───────────────────────────────────────────────── |
| `src/pages/Situations.tsx` | Versión catalana pendiente: se vuelve a Inicio. |
| `src/pages/Sounds.tsx` | The Sounds UI (minimal pairs game, shadowing) was built around SoundEntry. catalanSounds.ts has a different shape (no minimal pairs / shadowing phrase data yet) — this adapts what exists rather… |
| `src/pages/Stories.tsx` | Generate form state ─── Library view ───────────────────────────────────────────────────────── ─── Story Reader ───────────────────────────────────────────────────────────── |
| `src/pages/Words.tsx` | Misma regla que al leer: una palabra "en aprendizaje" entra al repaso. |

## Componentes (`src/components`)

| Archivo | Para qué sirve |
|---|---|
| `src/components/AchievementCelebration.tsx` | Animación con confeti al desbloquear un logro. |
| `src/components/Charts.tsx` | Gráficos SVG simples (línea/área) para la pantalla de progreso. |
| `src/components/ClickableText.tsx` | def puede ser null: la palabra se puede guardar aunque el diccionario falle. Word mode state Sentence mode state |
| `src/components/CoachFeedback.tsx` | Tarjeta plegable con la corrección del coach (Correction / More natural / Key tip). |
| `src/components/HomeNudges.tsx` | Plan de hoy (qué conviene hacer ahora). Solo inglés por ahora. Un solo paso a la vez: la tarjeta abre directo la próxima tarea del plan. |
| `src/components/Layout.tsx` | Estructura general de las pantallas: menú lateral o barra inferior y contenido. |
| `src/components/LevelLadder.tsx` | Escalera de nivel: muestra el nivel actual, la evidencia que falta y metas de apoyo. |
| `src/components/LiveCall.tsx` | La sesión se crea una sola vez por llamada. eslint-disable-next-line react-hooks/exhaustive-deps Cronómetro mientras la llamada está en vivo. |
| `src/components/Loader.tsx` | Full-page loader — orbe coral de la marca. |
| `src/components/Maica.tsx` | ── Warm grey-taupe tabby palette ────────────────────────────────────────── Colores de proyecto para accesorios y efectos Tail path per mood |
| `src/components/MultipleChoiceQuiz.tsx` | Quiz de opción múltiple reutilizable (Situaciones y Gramática). |
| `src/components/Nav.tsx` | La interfaz sigue al idioma que se aprende (ver src/i18n/index.ts). Averigua una vez si el servidor ofrece voz natural (Azure) para el inglés. |
| `src/components/ProtectedRoute.tsx` | Antes: loader infinito. Ahora: mensaje claro con reintento. |
| `src/components/ReadingFinish.tsx` | Palabras a recordar: las guardadas hasta el momento de empezar. ── Pantallas ────────────────────────────────────────────────────────────── done |
| `src/components/ReportExtras.tsx` | Bloques extra de los informes de sesión (frases sugeridas, errores clave). |
| `src/components/ShadowingBlock.tsx` | Si se pasa lang como prop (override), usarlo; si no, usa learning_language del usuario Puntaje real (Azure). null = no disponible o todavía calculando. Grabación (WAV) para pedirle al coach… |
| `src/components/ThemeToggle.tsx` | Botón para cambiar entre modo Día y Noche. |
| `src/components/VoiceOrb.tsx` | Orbe animado que muestra el estado de la voz (escuchando, hablando, pensando). |
| `src/components/XpCard.tsx` | Celebración de subida de nivel: compara con el último nivel visto en este dispositivo. |
| `src/components/hubIcons.ts` | Relación entre nombres de ícono y los íconos de lucide-react para las puertas. |
| `src/components/situationIcons.ts` | Relación entre nombres de ícono y los íconos de lucide-react para las situaciones. |

## Lógica y datos (`src/lib`)

| Archivo | Para qué sirve |
|---|---|
| `src/lib/achievements.ts` | Definición de los logros y cómo se comprueba cada uno. |
| `src/lib/anki.ts` | Exporta tarjetas a un archivo de texto que Anki importa directamente (File → Import). Formato: separador TAB, con directivas de cabecera que Anki entiende (#separator, #html, #notetype, #deck,… |
| `src/lib/buildSystemPrompt.ts` | Dispatch to language-specific prompt builder |
| `src/lib/callMode.ts` | Ajustes del modo llamada de voz (Conversación). |
| `src/lib/catalanListeningPatterns.ts` | 10 listening patterns catalanes — hardcoded en TS, no BD Patrons de pronunciació i elisió comuns que el learner ha de reconèixer |
| `src/lib/catalanSounds.ts` | 12 sounds catalanes — hardcoded en TS, no BD Referència IPA y articulación para pronunciation exercises |
| `src/lib/claude.ts` | Edge Function signals a retryable overload (503/429 + { retryable: true }) |
| `src/lib/coachFormat.ts` | Formato de las respuestas del coach en la conversación. Antes cada respuesta era un bloque largo mezclando lo que el coach DICE con el feedback sobre tu mensaje (corrección, tip, pronunciación).… |
| `src/lib/conversationOpeners.ts` | Primera frase del coach al abrir una conversación. Antes la app mandaba un mensaje FALSO como si lo hubieras escrito vos ("Hi! I'd like to talk about…") y encima contaba como uno de los 3 turnos… |
| `src/lib/correctionText.ts` | Devuelve el texto de la sección del corrector cuyo título (en **negrita**) coincide con `keyword`, p. ej. /natural/i → la versión natural. |
| `src/lib/dailyLesson.ts` | Joined at read time — not a DB column Check if lesson already exists for today La palabra se elegía solo al crear la fila: si ese día todavía no había |
| `src/lib/dates.ts` | Fechas en hora LOCAL del usuario, en formato YYYY-MM-DD. Nunca usar `toISOString().slice(0, 10)` para "el día de hoy": eso devuelve la fecha UTC y, para un usuario en Barcelona, la práctica del… |
| `src/lib/diagnosticQuestions.ts` | 26 preguntas graduadas A1 → C1 (5 por nivel). El scoring estima nivel por el escalón más alto que el usuario sostiene bien, no por el total bruto. Más preguntas por escalón: el nivel se estima con… |
| `src/lib/dictation.ts` | Dictado: frases para escuchar y escribir, y corrección palabra por palabra. |
| `src/lib/dictionary.ts` | Se guarda también sobre una fila vieja; si la política no lo permite, se ignora el error. |
| `src/lib/errorTypes.ts` | Catálogo de tipos de error. El coach los devuelve por su `key`; aquí mapeamos a etiqueta legible + pista de drill. |
| `src/lib/geminiTools.ts` | Cliente de la función `gemini-tools`: feedback de voz con audio, fotos y credencial para la conversación en tiempo real. Las respuestas se normalizan (la IA puede equivocarse de forma) antes de… |
| `src/lib/grammarLessons.ts` | Mini lecciones de gramática en inglés, explicadas en español neutro. Cada una se asocia a los tipos de error (errorTypes.ts) que el coach detecta, así "My mistakes" puede recomendar la lección justa. |
| `src/lib/grammarProgress.ts` | Progreso de las lecciones de gramática. Reutiliza situation_progress con pack_id "grammar:<id>" y steps.quiz = mejor puntaje (no hace falta tabla nueva). |
| `src/lib/hints.ts` | Pistas de respaldo cuando el coach no devuelve una sugerencia. |
| `src/lib/hubs.ts` | Las 5 puertas de la app. Cada puerta agrupa herramientas por lo que la persona quiere HACER (hablar, escuchar y leer, recordar, ver su avance), no por cómo están construidas. Las rutas existentes… |
| `src/lib/json.ts` | Parser único para respuestas JSON de la IA. Los modelos a veces envuelven el JSON en ```json, agregan texto antes o después, dejan comas finales o usan comillas tipográficas. Antes cada módulo… |
| `src/lib/language.ts` | The `language` column was added by hand to several tables after they already had rows (English content/history predates the Catalan rollout). Those old rows may have `language = null` instead of… |
| `src/lib/levelLadder.ts` | Escalera de nivel: qué te falta para pasar al siguiente nivel. Usa los MISMOS criterios que la consolidación diaria (leveling.ts): fuerza de repaso, precisión en conversación y diagnóstico, con el… |
| `src/lib/leveling.ts` | Re-leveling continuo. Recalcula profiles.current_level una vez por día (consolidación) a partir de la evidencia reciente. Pesos aprobados: Repaso (SRS) 60% · Conversación 30% · Diagnóstico 10%.… |
| `src/lib/linkingData.ts` | ── Contractions ───────────────────────────────────────────────────────── ── Linking ─────────────────────────────────────────────────────────────── ── Reductions… |
| `src/lib/liveSession.ts` | Conversación en tiempo real con Gemini Live (voz a voz) — BETA. Flujo: la función `gemini-tools` entrega una credencial de un solo uso; el navegador abre un WebSocket directo con Gemini, envía el… |
| `src/lib/mistakes.ts` | Errores recurrentes: resumen por tipo (último mes vs mes anterior) y ejercicios dirigidos generados por la IA (con la quiz de la lección como respaldo). |
| `src/lib/monitoring.ts` | Inicializa Sentry (errores en producción) si hay DSN configurado. |
| `src/lib/naturalVoice.ts` | Voz natural (Azure Neural TTS) para el inglés, con respaldo a la voz del navegador. - Se consulta una vez si el servidor la tiene configurada (501 = no). - El audio se cachea en memoria por… |
| `src/lib/notifications.ts` | Permiso y suscripción a notificaciones push del dispositivo; guarda la suscripción en la base. |
| `src/lib/oralDiagnostic.ts` | ── Reading sentences — cubren sonidos difíciles para hispanohablantes ───────── ── CEFR helpers ───────────────────────────────────────────────────────────── ── Combinar escrito + hablado… |
| `src/lib/plan.ts` | Plan de estudio: "tu semana" y las tareas recomendadas de hoy. Todo se deduce de lo que la persona ya hizo (xp_events, progreso de situaciones, repaso pendiente y errores), sin tablas nuevas. Las… |
| `src/lib/practice.ts` | Reglas compartidas de "qué cuenta como práctica". Un único umbral para todos los módulos conversacionales: el botón de terminar siempre está disponible, pero la sesión solo se registra para la… |
| `src/lib/pronunciation.ts` | El timeout solo pide el cierre; onDone es siempre quien resuelve. Si la IA no devuelve JSON usable, se muestra su texto tal cual y una frase corta para repetir. |
| `src/lib/pronunciationAssess.ts` | Puntaje real de pronunciación (Azure Speech vía la función `pronunciation-assess`). Flujo: se graba el audio en paralelo al reconocimiento del navegador, se convierte a WAV PCM 16 kHz mono y se… |
| `src/lib/pronunciationPhrases.ts` | A2 — th (voiced) A2 — short vs long vowels B1 — th + r cluster |
| `src/lib/readingQuiz.ts` | Preguntas de comprensión para cerrar una lectura. Las genera el coach en inglés simple (nivel del texto) y se guardan en el navegador por texto, así que cada lectura gasta una sola llamada. |
| `src/lib/readingTexts.ts` | Textos en català — vida quotidiana a Barcelona, cultura i tradicions |
| `src/lib/reviewCards.ts` | Repaso en inglés primero. Cada tarjeta elige un ejercicio según qué tan firme está el ítem (reps) y nunca pide traducir desde el español: reps 0 → "meet": se ve y se oye la frase con su definición… |
| `src/lib/reviewMeta.ts` | Definiciones y ejemplos en inglés simple para las tarjetas de repaso. Se piden a la IA en UNA sola llamada por sesión y se guardan en el navegador, así cada ítem se genera una vez. Si falla, el… |
| `src/lib/scenarios.ts` | Escenarios genéricos, sirven para cualquier usuario. El coach los adapta al nivel y contexto de cada uno vía el system prompt. Escenarios catalanes — contexto Barcelona, vida quotidiana |
| `src/lib/sessionReport.ts` | Genera y guarda el informe al terminar una sesión (resumen, lo bien hecho, errores clave). |
| `src/lib/situations.ts` | Lógica de Situaciones: progreso por misión, quiz y puente hacia Roleplay. El contenido vive en situationsData.ts; el progreso, en la tabla `situation_progress` (una fila por persona y situación). |
| `src/lib/situationsData.ts` | Situaciones: misiones por temática para practicar a fondo un contexto real. Cada una trae frases clave, vocabulario, un diálogo modelo, un quiz y un roleplay con el coach. Todo en inglés (versión… |
| `src/lib/soundsData.ts` | Contenido de los sonidos difíciles del inglés: IPA, cómo articularlos, pares mínimos y frase para repetir. |
| `src/lib/speech.ts` | Wrappers finos sobre la Web Speech API (nativa del navegador, gratis). Este archivo cubre SOLO el lado TTS (lectura en voz alta) + la detección de |
| `src/lib/srs.ts` | quality === "good" ignoreDuplicates: conflicting rows are skipped and NOT returned |
| `src/lib/stories.ts` | Tipos y funciones de acceso a historias y su progreso. |
| `src/lib/storyLibrary.ts` | Lógica de la biblioteca de historias: categorías por tema, tiempo de lectura y orden "para vos". Funciones puras (testeadas), sin acceso a la base. |
| `src/lib/supabaseClient.ts` | No tiramos error fatal para no romper el render, pero avisamos fuerte. |
| `src/lib/theme.ts` | Colores de marca para usos en JS (SVG, gráficos, confeti) y cambio de tema. Los valores reales viven en index.css como variables; acá se leen del tema activo. En className usá siempre las clases… |
| `src/lib/topics.ts` | Temas de conversación. Única fuente de verdad: los usan la pantalla de Conversación (temas fijos), la práctica diaria (tema del día) y los tests, que garantizan que cada tema tenga su pregunta de… |
| `src/lib/types.ts` | Voice settings (added in DB migration) Control de la consolidación diaria de nivel (lib/leveling.ts) |
| `src/lib/useHistoryBack.ts` | Si la vista se cerró con un botón de la pantalla, quitamos la entrada que agregamos. Solo retrocedemos si el historial sigue en nuestro paso. onClose cambia en cada render; el efecto solo debe… |
| `src/lib/useResumableSession.ts` | Detecta una conversación o roleplay a medias (últimas 48 h) para ofrecer retomarla. |
| `src/lib/useSpeechCapture.ts` | Captura de voz — IMPLEMENTACIÓN CANÓNICA ÚNICA de toda la app. Reemplaza a useTurnRecorder, useSingleUtterance y createRecognizer (borrados). Ningún módulo puede crear su propio SpeechRecognition… |
| `src/lib/useVoicePrefs.ts` | Preferencias de voz del usuario (voz, velocidad, acento) leídas del perfil. |
| `src/lib/vocabulary.ts` | La columna `phonetic` falta en algunas bases (el esquema se armó a mano): si es el caso se guarda igual sin ella. Antes el error se perdía y la palabra nunca llegaba a "Mis palabras".… |
| `src/lib/xp.ts` | Experiencia (XP) y niveles. Cada actividad da XP según tres cosas: - cantidad: cuánto hiciste (turnos, preguntas, repasos), - calidad: cuántos errores cometiste por turno, - esfuerzo: cuánto… |

## Contexto de sesión (`src/context`)

| Archivo | Para qué sirve |
|---|---|
| `src/context/AuthContext.tsx` | Nunca se traga el error: antes un fallo dejaba al usuario en un loader infinito. Conserva la referencia si nada cambió: Supabase refresca el token cada hora y al volver a la pestaña; sin esto,… |

## Textos de interfaz (`src/i18n`)

| Archivo | Para qué sirve |
|---|---|
| `src/i18n/ca.ts` | Forma de los mensajes (mismas claves, valores string), sin atar los valores a inglés. Textos de interfaz en català. Mismas claves que en.ts (`satisfies` obliga a que falte o sobre alguna clave y… |
| `src/i18n/en.ts` | Textos de interfaz en inglés. Es la referencia de claves: ca.ts debe tener exactamente las mismas (lo verifica TypeScript vía `satisfies` en ca.ts). |
| `src/i18n/index.ts` | Configuración de i18next: elige el idioma de la interfaz según el idioma que se aprende. |

## Funciones del servidor (`supabase/functions`)

| Archivo | Para qué sirve |
|---|---|
| `supabase/functions/claude-proxy/index.ts` | El coach: recibe el chat desde la app, valida la sesión (JWT) y la cuota diaria, llama a Gemini (modelo principal y de respaldo) y devuelve el texto o un JSON. La clave de Gemini nunca llega al navegador. |
| `supabase/functions/gemini-tools/index.ts` | gemini-tools — funciones de Gemini que usan audio, imágenes y voz en tiempo real. Modos (campo `mode` del cuerpo JSON): - "audio": feedback de pronunciación o transcripción a partir de una… |
| `supabase/functions/pronunciation-assess/index.ts` | pronunciation-assess — puntaje real de pronunciación con Azure Speech. El cliente manda el audio (WAV PCM 16 kHz mono, base64) y la frase de referencia; la función llama a la API REST de… |
| `supabase/functions/send-reminders/index.ts` | send-reminders — recordatorio diario por Web Push. Lo dispara pg_cron cada 15 minutos (ver docs/CIERRE/08-recrear-desde-cero.md, sección D). Para cada usuario con notification_time, calcula la… |
| `supabase/functions/speech-tts/index.ts` | speech-tts — voz natural (Azure Neural TTS) para el inglés de la app. El navegador manda el texto y la voz; la función devuelve audio MP3. La clave de Azure nunca llega al cliente. Sin las claves… |

## Scripts y pruebas de extremo a extremo

| Archivo | Para qué sirve |
|---|---|
| `scripts/seed/catalan-data.ts` | Contenido catalán: datos puros, sin efectos. Antes este archivo creaba su propio cliente Supabase y se auto-ejecutaba, pero leía `import.meta.env` (solo existe bajo Vite, no bajo node/tsx) y usaba… |
| `scripts/seed/run-catalan.ts` | Seed de contenido catalán → Supabase. Reemplaza a supabase/migrations/0003_seed_catalan.sql, que tenía DOS fallas: 1. No insertaba nada (y el SQL Editor hacía rollback silencioso de las 97 filas… |

## Pruebas (`src/__tests__`, 26 archivos)

- `anki.test.ts`
- `coachFormat.test.ts`
- `combineLevels.test.ts`
- `content.test.ts`
- `correction.test.ts`
- `dates.test.ts`
- `diagnostic.test.ts`
- `dictation.test.ts`
- `geminiTools.test.ts`
- `hubs.test.ts`
- `i18n.test.ts`
- `json.test.ts`
- `leveling.test.ts`
- `liveSession.test.ts`
- `mistakes.test.ts`
- `openers.test.ts`
- `planLadder.test.ts`
- `pronunciationAssess.test.ts`
- `readingQuiz.test.ts`
- `reviewCards.test.ts`
- `sessionReport.test.ts`
- `situations.test.ts`
- `storiesSeed.test.ts`
- `storyLibrary.test.ts`
- `tiebreak.test.ts`
- `xp.test.ts`
