# Auditoría de textos e idioma (Fase 0 del plan de catalán)

Fecha: 2026-11-22. Solo lectura: no se cambió código. Conteos aproximados, hechos con búsqueda de texto.

**Corrección:** la versión anterior de esta auditoría decía que el patrón `isCatalan ? … : …` estaba solo en 3 archivos. Era un error: solo busqué `isCatalan` y no vi el patrón `learningLanguage === "ca" ? … : …`, que es el que usan la mayoría de las páginas. Esta versión corrige eso.

## Cómo está hoy el catalán

El catalán ya tiene texto propio en la mayoría de las pantallas principales. Lo hace con ramas en línea, sin diccionario:

```tsx
{learningLanguage === "ca" ? "El teu progrés" : "Your progress"}
```

Esto funciona, pero tiene tres problemas:

1. **Las traducciones están repartidas.** Cada pantalla tiene su propia copia de "Racha", "Sessions", "Guardar", etc. Hay el mismo texto en muchos lugares.
2. **Hay textos solo en inglés.** Varios títulos y etiquetas no tienen rama catalana: "What to work on", "Top errors", "Session complete", "Practice now", "Worth practising again", entre otros.
3. **Hay textos en catalán sin rama** o escritos en catalán directo: por ejemplo "Entrena la meva orella" en `Listening.tsx`, dentro de una rama que solo se activa con `isCatalan`.

## Por pantalla (las 8 principales)

| Pantalla | Estado para alumno de catalán |
|---|---|
| `Profile.tsx` | Textos completos en catalán. Algunas opciones de voz dependen del dispositivo. |
| `Progress.tsx` | Textos en catalán. **Oculta** `SkillLevels` (sección de niveles). |
| `Dashboard.tsx` | Textos en catalán. **Oculta** el enlace a errores y la tarjeta de XP. |
| `Roleplay.tsx` | Textos completos en catalán. Escenarios: `SCENARIOS_CA`. |
| `Conversation.tsx` | Textos en catalán. **Oculta** la sesión reanudable. |
| `Listening.tsx` | Textos en catalán mezclados con algunos en catalán directo. **Sin XP**: `awardXp` se omite para catalán (línea 398). Posiblemente un olvido. |
| `Onboarding.tsx` | Textos completos en catalán. |
| `Reading.tsx` | Textos en catalán. Usa `READING_TEXTS_CA`. **Oculta** el cierre con comprensión (`ReadingFinish`). |

## Ocultamientos (resueltos)

Decisión: nada queda oculto para catalán. Se quitaron los filtros `learning_language !== "ca"` de las páginas y de `SkillLevels` y `XpCard`. El XP de escucha ahora también se suma en catalán. `ReadingFinish` pasó a un diccionario en inglés y catalán, y el cuestionario de lectura se genera en catalán con explicaciones en castellano (caché separado por idioma).

Pendiente de verificar: la calidad de las preguntas de lectura generadas en catalán, y cómo se ve la app con una cuenta de catalán (no hay una cuenta de prueba de catalán en el navegador).

## Ocultamientos (histórico)

Estas funciones se ocultan para catalán, pero no se sabe si es a propósito:

- `SkillLevels` (Progress), tarjeta de XP y enlace a errores (Dashboard).
- Sesión reanudable (Conversation) y cierre con comprensión (Reading).
- XP de escucha (Listening): el catalán no suma XP. Probablemente es un olvido, porque la ruta de escucha en catalán sí existe.

Hay que decidir si cada uno vuelve para catalán o se queda oculto a propósito. Si se queda oculto, debería estar documentado.

## Consecuencias para el plan

- **Fase 1 (diccionario) es consolidar y completar, no empezar de cero.** Hay que juntar las ramas repetidas y extraer las cadenas solo en inglés. Es trabajo mecánico y verificable.
- **Los ocultamientos son decisiones de producto**, no de código. Hay que resolverlos antes de Fase 2.
- **`learning_language` aparece en unos 30 archivos** (unas 400 líneas). No todas son textos: algunas deciden contenido, como `SCENARIOS_CA` o `READING_TEXTS_CA`.
- **El test de nivel** ya tiene su banco en catalán y no entra en esta lista.

## Próximo paso propuesto

1. Decidir los ocultamientos de la sección anterior (una decisión por función).
2. Contar exactamente las cadenas en inglés sin rama catalana, con una búsqueda por archivo.
3. Recién después, arrancar Fase 1.
