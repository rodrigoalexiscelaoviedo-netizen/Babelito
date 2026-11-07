# 10. Pendientes, bugs conocidos y deuda técnica

Lo que quedó sin hacer o sin verificar al cierre, ordenado por importancia.

## A. Sin verificar (requiere micrófono)

Estas funciones se programaron y se probaron en lo posible, pero **nunca se probaron con voz real** durante el desarrollo asistido:

- **Call** (llamada manos libres) en Conversación.
- **Live** con audio (voz a voz). El token y el WebSocket se verificaron con un turno de texto; falta el audio.
- **Say it** en las frases de lectura y **Listen & repeat** con puntaje real (Azure).
- **Feedback de voz** del coach con una grabación real (el modo `audio` se probó con voz sintética y funciona).
- La parte oral del test de nivel (lectura en voz alta y respuesta hablada).

## B. Producto

1. **Test de nivel más completo.** Hoy es solo gramática y vocabulario (más lo oral). Un nivel real también necesita **comprensión de lectura y de escucha**. Con 5 preguntas por nivel el margen de error sigue siendo alto.
2. **Mismo cierre interactivo en Stories, Mis palabras y Biblioteca de frases.** Reading ya tiene comprensión + palabras + XP; el resto no.
3. **Objetivos por temática** (p. ej. "prepararme para entrevistas") como un camino guiado de varios días. Hoy existen las Situaciones, pero no un recorrido que las encadene.
4. **Más variedad lúdica y multimedia:** juegos, videos, audios de nativos. Lo que existe es texto, voz y quizzes.
5. **Ligas, desafío semanal y medallas por XP.** Decisión de producto.
6. **Modo sin conexión** del contenido (caché con el service worker).
7. **Ruta por módulos tipo curso** y preparación de certificados (en catalán, formato oficial por verificar).
8. **Catalán:** la mayoría de las herramientas nuevas (Situaciones, Gramática, Mis errores, Dictado, Plan, cierre de lectura, repaso en inglés primero) no existen en catalán; el coach y las voces sí. Al retomarlo hay que revisar interfaz, test, contenido y coach.
9. **Analítica de producto** (solo hay Sentry para errores).

## C. Datos y servidor

1. **Reconciliar el esquema.** Migraciones ≠ producción (ver `05-base-de-datos.md`). Falta agregar `phonetic` a `user_vocabulary` (el código ya lo tolera) y volcar el esquema real a esta carpeta con las consultas indicadas.
2. **Política de `word_definitions`:** si no permite actualizar, las definiciones viejas se vuelven a pedir cada vez. Conviene permitir la actualización o limpiar la caché vieja.
3. **Dos historias en inglés** de producción no están en los archivos SQL del proyecto; en catalán hay 82 expresiones en producción y 80 en el script.
4. **`situation_progress`** estaba vacía al cierre: comprobar con una situación completa que el avance y los +50 XP se guardan.
5. **Privacidad de Gemini gratuito:** Google puede usar lo enviado. Antes de abrir la app a más gente, evaluar el nivel de pago.
6. **Live usa un modelo en vista previa** que puede cambiar.

## D. Calidad y código

- **ESLint:** 0 errores y unos 11 avisos (sobre todo `setState` dentro de efectos y dependencias de hooks). No impiden nada.
- **Consultas `select("*")`** en varios lugares: deberían pedir solo las columnas que usan.
- **`current_level` y el diagnóstico:** el límite que impone el diagnóstico al nivel automático puede ser demasiado rígido (ver `09-decisiones.md`).
- **Colores de gráficos** (SVG) se leen del tema al dibujarse; al cambiar entre Día y Noche se actualizan en la siguiente navegación.
- **Error tras actualizar la app:** si se abre la app justo cuando se publica una versión, el navegador puede pedir un archivo viejo y mostrar "Algo salió mal". Se resuelve recargando; podría automatizarse.
- **Pruebas:** hay 206 unitarias. No hay pruebas automáticas de las pantallas nuevas (lectura interactiva, cierre, repaso) ni de las funciones del servidor.

## E. Costos y vencimientos

- **Azure:** la cuenta con crédito de prueba vence cerca del **27 de noviembre de 2026**. Revisar en el portal que el recurso Speech sigue en F0.
- **Supabase gratuito** puede pausar el proyecto por inactividad.

## F. Ideas descartadas o pospuestas

- Instalar skills de diseño de terceros pensadas para landings.
- Volver a un proxy WebSocket propio para Live (inseguro por el JWT en la URL).
- Reproducir libros con copyright como historias.
