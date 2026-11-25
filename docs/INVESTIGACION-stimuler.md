# Stimuler y qué aplicar a IA Live (2026-11-25)

## Alcance y fiabilidad

Basado en la web de la empresa, su ficha de App Store, capturas de marketing y reseñas de terceros. **No se probó la app.** Google Play no cargó completo.

Fuentes: [inicio](https://stimuler.tech/) · [entrevistas](https://stimuler.tech/interview-english) · [IELTS](https://stimuler.tech/ielts) · [comparativa con Speak](https://stimuler.tech/blog/speak-vs-stimuler-2026) · [App Store](https://apps.apple.com/us/app/stimuler-english-speaking-app/id1627501632) · [alta](https://fnl-3c8bb6b5.stimuler.tech/start) · [nota de YourStory](https://yourstory.com/2025/07/startup-helping-esl-learners-find-voice-ai-iit-bhu)

## Qué hace (según la empresa)

**La llamada**
- Llamada de voz con una tutora, Sarah, con modo manos libres.
- Más de 100 temas y escenarios: entrevista, reunión con cliente, viajes, IELTS.
- Hace repreguntas sobre lo que la persona dijo, como un entrevistador o examinador.

**Después de hablar**
- Notas de fluidez, pronunciación, gramática y vocabulario.
- Muletillas, ritmo, pausas, claridad y tono.
- En cada frase propia: "1 error · ver", la versión mejorada y una etiqueta con el motivo (tiempo verbal, preposición).
- Botón para decir en voz alta la versión mejorada.
- Pronunciación palabra por palabra (afirmación de la empresa, sin verificar).

**Entre sesiones**
- Plan día a día y ejercicios cortos (6 a 10 min) sobre lo que falló.
- Comparación de notas en el tiempo.
- Rachas compartidas con amigos.
- Simulacros de IELTS con banda estimada.
- Alta: idioma nativo y objetivo (entrevistas, IELTS, reuniones, vida social).

**No documentado:** pistas durante la llamada, traducción, ayuda al trabarse, turnos e interrupciones, ajuste de dificultad.

**Críticas de usuarios (App Store):** una reseña dice que aprueba cualquier respuesta, incluso en español; otra que la IA es básica.

## Comparación con IA Live de Babelito

| Función | Babelito hoy |
|---|---|
| Voz en tiempo real, 15 min, interrupciones | Sí |
| Situaciones y modo sorpresa | Sí (18) |
| Pista corta durante la llamada | Sí (no documentado en Stimuler) |
| Informe: aciertos, prioridades, vocabulario, próximos pasos | Sí |
| Guardar los errores de la llamada | **No** |
| Transcripción revisable frase por frase | No (se descarta al salir) |
| Repetir en voz alta la versión mejorada | No en la llamada |
| Notas por dimensión y evolución | No en la llamada |
| Repreguntas explícitas sobre lo dicho | Sin instrucción específica en el prompt |

## Propuesta, por orden

1. **Guardar las correcciones de la llamada en `errors`.** Así alimentan "Mis errores", la tarea de hábito de Inicio y el nivel. El resto depende de esto. Revisar antes cómo pesa en `leveling.ts`.
2. **Repreguntas.** Agregar al prompt que cada pregunta siga algo concreto que la persona acaba de decir y que en entrevistas profundice como un entrevistador. Cambio chico.
3. **Revisión frase por frase.** Al colgar, la transcripción con las frases con error marcadas, la versión mejorada y la etiqueta del motivo.
4. **"Decilo mejor".** Repetir cada versión mejorada. Hay `pronunciation-assess` (Azure) en el proyecto; da puntaje por palabra si las claves están configuradas (sin verificar).
5. **Notas y evolución.** Gramática, vocabulario y fluidez estimadas desde la llamada, guardadas para comparar. La pronunciación no se puede puntuar desde la transcripción: solo saldría del paso 4. Requiere tabla o columna nueva.
6. **Ejercicios desde los errores** al terminar, reutilizando "Mis errores" y el repaso.

**Dejaría fuera por ahora:** IELTS, rachas con amigos y personaje con video.

**Ayuda al trabarse** (pista, "repetí más lento", traducir la última frase): no es de Stimuler según lo que se pudo leer; sería una mejora propia.
