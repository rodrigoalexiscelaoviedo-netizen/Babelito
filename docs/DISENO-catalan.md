# Diseño: catalán para hispanohablantes (plan)

Estado: **plan, sin implementar**. Ninguna línea de código cambia hasta aprobar este documento.

## 1. Alcance acordado

- **Quién aprende:** alguien que ya habla castellano y quiere aprender catalán.
- **Interfaz:** igual que la de inglés (mismas pantallas, mismo flujo).
- **Explicaciones y pistas:** en castellano. El contenido y la práctica, en catalán.
- **Revisión nativa:** por ahora, ninguna. Riesgo asumido (ver sección 7).

## 2. Estado actual (lo que ya existe)

- Campo de idioma por perfil (`learning_language`).
- Test de nivel en catalán: 40 ítems, mismo motor que en inglés (ver `docs/DISENO-test-nivel.md`).
- Escenarios y textos de lectura en catalán (`scenarios.ts`, `readingTexts.ts`).
- Semilla SQL en catalán (`supabase/migrations/0003_seed_catalan.sql`), de contenido incierto según la memoria del proyecto.
- Voz: síntesis en catalán (`TARGET_TTS_LANG.ca`).
- Textos de interfaz: la mayoría de las pantallas principales tienen ramas en línea `learningLanguage === "ca" ? "…" : "…"`, sin diccionario. Algunas cadenas quedaron solo en inglés. Varias funciones se ocultan para catalán sin que esté decidido si es a propósito. Detalle en `docs/auditoria-textos.md`.
- `learning_language` aparece en unos 30 archivos (unas 400 apariciones): decide contenido, no solo textos.
- Prompts de IA (coach, examinador, correcciones, informe): escritos en inglés, con reglas como "Speak English only".

## 3. Fases

### Fase 0 · Auditoría y preparación (sin cambios de comportamiento)

1. **Auditar el inglés:** buscar todo texto visible fijo en español o mezclado, y todo texto que dependa de `isCatalan`. Lista en `docs/auditoria-textos.md`.
2. **Definir la estructura del diccionario:** claves en inglés como base, un archivo por área (`i18n/en.ts`, `i18n/ca.ts`), y una función `t(key)` que lee el idioma del perfil.
3. **Decidir cómo se nombra el idioma del alumno en el código:** `learning_language` ya existe; confirmar que todas las consultas lo usan y no asumen inglés.

Criterio de salida: lista de textos completa y estructura aprobada.

**Corrección (2026-11-22):** el proyecto ya tiene `i18next` con `src/i18n/en.ts` (39 claves) y `src/i18n/ca.ts` (44 claves), más su test. Solo `Nav.tsx` lo usa. Por eso la Fase 1 no crea un diccionario nuevo: usa este. Los textos de las pantallas se migran a `t("clave")` en lotes, no de golpe.

### Fase 1 · Diccionario de interfaz (inglés primero, con i18next)

1. Mover los textos del inglés al diccionario, sin cambiar lo que se ve.
2. Reemplazar los ternarios `isCatalan` por `t(key)`, pantalla por pantalla.
3. Tests: que cada clave exista en ambos idiomas y que no queden textos sueltos en las pantallas tocadas.

Criterio de salida: la app en inglés se ve igual que antes, y no quedan ternarios de idioma en las pantallas migradas.

### Fase 2 · Interfaz en catalán

1. Escribir `i18n/ca.ts` con las mismas claves que inglés.
2. Revisar la lista de claves faltantes en el test.
3. Verificar en navegador en claro, oscuro y móvil (375 px), como pide el proyecto.

Criterio de salida: la app completa en catalán, sin textos en inglés ni en español para quien aprende catalán.

### Fase 3 · Prompts de IA y explicaciones en castellano

1. Reescribir los prompts de IA Live, examinador, correcciones y el informe. El alumno habla castellano, así que las explicaciones van en castellano y la práctica en catalán.
2. Reglas de error específicas del catalán (clíticos, pronombres febles, verbs irregulars, `ç`, `l·l`, `ny`) en la base de la rúbrica del examinador.
3. Probar el prompt con respuestas de ejemplo y revisar a ojo los resultados.

Criterio de salida: el examinador y el coach responden y corrigen en catalán, con explicaciones en castellano.

### Fase 4 · Voz (verificación con audio real)

1. **Síntesis (TTS):** probar `ca-ES` en los dispositivos que usa el alumno (Android, Windows, iOS). Si no hay voz instalada, decidir qué se muestra.
2. **Reconocimiento:** probar Web Speech en `ca-ES` con voz real.
3. **Pronunciación (Azure):** confirmar que el servicio evalúa `ca-ES` con los sonidos del catalán.
4. **Gemini Live:** confirmar que el modelo de voz habla catalán con calidad. Si no, la sesión queda solo para inglés y se decide qué hacer con el catalán.

Criterio de salida: cada punto probado con audio real, con resultado anotado. Si algo falla, se documenta y se decide antes de seguir.

### Fase 5 · Contenido por niveles

1. Escribir frases, chunks, lecciones de gramática y ejercicios de escucha por nivel (A1–C1), en catalán, con explicaciones en castellano.
2. Separar el contenido por idioma en la base de datos (ver sección 4).
3. Tests de estructura: cada nivel con contenido suficiente y sin campos vacíos.

Criterio de salida: contenido suficiente para que el alumno no se quede sin práctica en A1–B1.

## 4. Base de datos

- **`chunks.english`:** el nombre es engañoso. Guarda el idioma que se aprende, no inglés (anotado en memoria). Antes de sumar catalán, hay que decidir si se renombra o si se deja con un comentario claro. Cambiarlo implica migración y tipos (`src/lib/types.ts`) en el mismo commit.
- **Contenido por idioma:** columna `language` en las tablas de contenido, o tablas separadas. Preferencia: columna, para no duplicar código.
- Cualquier tabla nueva se tipa en `types.ts` en el mismo commit que la crea (regla del proyecto).
- **Migraciones:** el SQL lo corre Rodrigo a mano en Supabase. El plan lista cada migración antes de escribirla.

## 5. Pedagogía

- El catalán es cercano al castellano. Los errores típicos no son los mismos que en inglés: hay falsos amigos, pronombres febles, perífrasis distintas y formas verbales parecidas pero no iguales.
- La curva de dificultad y el orden de los temas se definen en Fase 5, con criterio de quien habla castellano.
- El test de nivel en catalán (40 ítems) es el punto de partida. Sin calibración con alumnos reales, sus niveles son una estimación.

## 6. Pruebas

- Tests de diccionario: claves completas en ambos idiomas.
- Tests de contenido por nivel.
- Tests del motor de test de nivel con banco en catalán (ya existen).
- Verificación en navegador en claro, oscuro y móvil, en cada fase que cambie la interfaz.
- Verificación de voz (Fase 4) con audio real, no solo con tests.

## 7. Riesgos

- **Sin revisión nativa:** errores de gramática y de uso natural pueden pasar como correctos. Mitigación: marcar el contenido como "revisado por IA, pendiente de revisión nativa" hasta que alguien lo revise, y no usar como base de evaluación oficial.
- **Voz:** la calidad de síntesis y de reconocimiento depende del dispositivo. Mitigación: Fase 4 antes de escribir contenido de audio.
- **Costos:** más uso de Gemini y Azure por idioma. Medir en Fase 4.
- **Alcance:** Fase 5 es mucho contenido. Mitigación: empezar por A1–B1.

## 8. Decisiones abiertas

1. ¿Se renombra `chunks.english` ahora o después de la Fase 1?
2. ¿El contenido catalán se marca como "pendiente de revisión" en la app, o no se muestra a alumnos hasta revisarlo?
3. ¿Fase 0 y Fase 1 (inglés) se hacen antes de cualquier catalán, aunque tarden más? Recomendado: sí.
