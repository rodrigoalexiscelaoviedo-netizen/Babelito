# Diseño: test de nivel real (propuesta)

Estado: **propuesta, sin implementar**. Reemplaza el test actual de 26 preguntas + lectura en voz alta + pregunta abierta.

## 1. Diagnóstico del test actual

- **Solo mide gramática y vocabulario de opción múltiple.** Cuatro alternativas, una correcta: el azar da 25 %, así que un alumno que adivina llega fácil a A2–B1.
- **La parte oral es lectura de frases y una pregunta abierta.** Leer en voz alta mide sobre todo pronunciación de frases dadas, no la capacidad de hablar. Y la pronunciación se puntúa con el reconocimiento del navegador, que es poco fiable.
- **Preguntas personales.** La pregunta abierta usaba los intereses del perfil (DJ, hobbies). Ya lo corregí a temas neutros; eso no resuelve el problema de fondo.
- **Nivel fijado por escalones fijos.** Cada nivel tiene 5 preguntas en un orden fijo, sin adaptarse a las respuestas. Un alumno fuerte responde 26 preguntas aunque quede claro en la mitad.
- **Un solo formato.** No hay escucha, no hay ordenar, no hay trabajo con imágenes ni sonidos.
- **Sin examinador.** Nadie hace preguntas de seguimiento para entender cómo habla la persona.

## 2. Qué dice la investigación

- **Tareas abiertas frente a tareas indirectas.** El marco CEFR advierte que cuanto más indirecta es la tarea (huecos en un diálogo, frases para completar), más difícil es generalizar el puntaje a la capacidad real. Para hablar, conviene una tarea con discurso interactivo. ([CoE, marco de evaluación CEFR](https://rm.coe.int/assessing-cefr-level/1680a9178c))
- **Guía de diseño de pruebas de idiomas.** El manual del Consejo de Europa y la rejilla de ALTE para pruebas orales piden definir primero el *constructo* (qué se quiere medir), el propósito (diagnóstica, de ubicación o de certificación) y la modalidad. ([ALTE/CoE, manual de desarrollo](https://rm.coe.int/new-revised-manual-for-language-test-development-and-examining-joint-p/48802cc30d))
- **Adaptativo.** Linguaskill ajusta la dificultad de cada tarea según una estimación continua de la habilidad, empezando en B2. Pero su parte adaptativa es de lectura y escucha; escritura y habla son de forma fija. Eso indica que adaptar la parte oral necesita validación propia. ([Cambridge, Linguaskill adaptativo](https://www.cambridgeenglish.org/Images/730808-linguaskill-adaptive-testing.pdf))
- **Formatos variados.** Duolingo English Test usa tipos de ítem variados (leer y completar, escuchar y escribir, completar frases y textos) con un motor que decide cuándo tiene suficiente evidencia. Un test corto debe seguir la misma lógica: variar el formato y terminar cuando la estimación ya es estable. ([Duolingo, guía de preguntas 2025](https://englishtest-static.duolingo.com/media/resources/Question%20Guide%20(2025).pdf))
- **Examinador con IA.** La investigación reciente (Cambridge, 2025) prueba LLMs para puntuar habla contra descriptores CEFR, pero con transcripciones y sin validación contra examinadores humanos certificados. Es prometedor, no está listo para decidir un nivel oficial. ([arXiv:2507.10200](https://arxiv.org/abs/2507.10200), [arXiv:2505.21148](https://arxiv.org/abs/2505.21148))

Conclusión: la IA sirve bien como **examinador conversacional que hace preguntas de seguimiento y puntúa con una rúbrica**, siempre que el resultado se combine con parte objetiva y se valide contra niveles reales de alumnos antes de confiar en él.

## 3. Propuesta

### 3.1 Cuatro bloques, ~15 minutos

| Bloque | Qué mide | Formato | Cómo se puntúa |
|---|---|---|---|
| **A. Ubicación rápida** | Vocabulario y gramática en contexto | Adaptativo, 10–12 ítems de formatos variados: completar, elegir la forma, ordenar palabras, emparejar | Objetivo, según dificultad del ítem (TRI simple) |
| **B. Escucha** | Comprensión oral | Audio corto (TTS) + 3–4 preguntas; algunas con imagen | Objetivo |
| **C. Lectura visual** | Lectura y vocabulario | Texto breve con imagen o tabla, y preguntas de inferencia | Objetivo |
| **D. Examinador IA (habla)** | Fluidez, interacción, gramática en uso, vocabulario | Conversación guiada de 4–6 minutos con preguntas que suben o bajan de nivel según lo que responde | Rúbrica CEFR de la IA, con transcripción y ejemplos citados |

Formatos extra en el bloque A y B para que no sea solo opción múltiple:
- **Ordenar palabras** para formar una frase.
- **Emparejar** palabra con imagen (visual).
- **Escuchar y elegir** la palabra o frase oída (sonido).
- **Transformar**: "I started learning English two years ___" → completar.
- **Corregir** una frase con error (muestra si reconoce el error, no solo la respuesta correcta).

Cada ítem lleva una etiqueta: `nivel_estimado`, `habilidad` (gramática, vocabulario, escucha, lectura), `formato`.

### 3.2 Motor adaptativo (bloques A–C)

- Empezar en **B1** (punto de partida neutral). Ítems de A1 a C1 en un banco etiquetado.
- Después de cada respuesta: subir si acierta, bajar si falla, con pasos de 1 nivel.
- Parar cuando la estimación esté estable (p. ej. la misma banda en 4 respuestas seguidas) o al llegar a 12 ítems.
- "No lo sé" cuenta como error, pero con menos peso que un error elegido (no castiga igual una adivinanza que una duda honesta). Decisión por confirmar.
- Corregir el azar: con 4 opciones el azar da 25 %, así que el ítem solo cuenta como "dominado" si el alumno acierta dos veces seguidas en su nivel. Esto evita que el adivinador suba.

### 3.3 Examinador IA (bloque D)

- **Modelo**: Gemini (ya lo usamos) en modo de texto para el examen, con audio por voz (Speech/Live) para hablar. El audio se transcribe y se evalúa el texto; no se usa el reconocimiento del navegador para puntuar.
- **Guion fijo, preguntas adaptables.** La IA recibe: un tema neutro (rutina, un viaje, un problema resuelto, cómo te movés por la ciudad), la rúbrica CEFR de 5 criterios (alcance, precisión gramatical, vocabulario, fluidez, coherencia) y un límite de preguntas.
- **Preguntas que la IA usa para subir o bajar:** comparar pasado y presente, pedir una opinión, pedir que describa algo, introducir una condición ("¿qué harías si…?"). Cada pregunta tiene un nivel objetivo y la IA elige la siguiente según la respuesta.
- **Salida estructurada**: JSON con `nivel_habla`, `criterios` (cada uno con evidencia citada de lo que dijo el alumno), `confianza`. Si la confianza es baja, se pide otra pregunta antes de decidir.
- **Evidencia visible**: el informe muestra frases literales del alumno para cada criterio. Nada de puntajes sin justificación.
- **Límites**: la IA no decide sola el nivel final. Se combina con los bloques A–C, y el resultado oral solo puede subir o bajar un escalón del escrito (misma regla que hoy en `combineLevels`).
- **Costo y latencia**: 4–6 minutos de audio por alumno. Hay que medir costo y latencia antes de elegir modelo; un modelo más barato puede ser suficiente para transcribir y el más capaz para puntuar.

### 3.4 Lo que sale del test

- Nivel inicial (como hoy), más un desglose por habilidad (gramática, vocabulario, escucha, lectura, habla) con evidencia.
- Lista corta de 3 cosas para trabajar primero.
- Guardar el resultado con su versión del test, para poder recalibrar sin perder historial.

## 4. Datos y tipos

- Nueva tabla `placement_attempts` (una fila por intento: ítems mostrados, respuestas, estimación por paso, transcripción del examinador IA, resultado final). Hay que tiparla en `src/lib/types.ts` en el mismo commit que la crea (regla del proyecto).
- Banco de ítems: en la base de datos (tabla `placement_items`) o en código, según cuántas preguntas haya. Textos del contenido en la base de datos; reglas de adaptación en código (regla del proyecto).
- Audio para escucha: generado con TTS del proyecto (`speech-tts`), guardado como asset estático, no en cada intento.

## 5. Fases propuestas

1. **Banco nuevo y motor adaptativo** (bloques A y motor), con el test actual como respaldo. Escribir ~80 ítems etiquetados por nivel y formato. *Riesgo: escribir buen contenido lleva tiempo; lo reviso yo, vos validás.*
2. **Bloques B y C** (escucha y lectura visual) con audio y dos o tres imágenes.
3. **Examinador IA (bloque D)** en texto primero (el alumno escribe), luego con voz.
4. **Calibración**: correr el test con alumnos de niveles conocidos y comparar con su nivel real. Sin esto no se debe usar el resultado para decidir contenido.

Fase 1 se puede hacer sin tocar el examinador IA. Las fases 2 y 3 dependen de decisiones de costo y de la calidad del audio.

## 6. Decisiones abiertas (para vos)

1. **Duración objetivo**: ¿12–15 minutos (propuesta) o algo más corto?
2. **"No lo sé"**: ¿cuenta como error completo, medio, o no cuenta (y pasa a otro ítem)?
3. **Examinador IA**: ¿en texto primero, o directamente con voz?
4. **Idioma de la prueba**: ¿catalán con el mismo diseño? Hoy el banco en catalán tiene 16 preguntas y no tiene desempate.
5. **Calibración**: ¿tenés alumnos de niveles conocidos para validar, o empezamos con criterio propio y lo ajustamos después?
