# XP, niveles, historias y navegación

## Cómo se gana XP (versión en inglés)

| Actividad | XP | Cómo se calcula |
|---|---|---|
| Conversación con el coach | hasta 40 + esfuerzo | 5 por turno tuyo (tope 40) × calidad + 1 por minuto (tope 15) |
| Roleplay | igual que la conversación | misma regla |
| Historia completa | 30 + hasta 30 | 30 por completarla + 30% del puntaje de comprensión |
| Repaso (SRS) | 3 (la recordaste) / 1 (la fallaste) | El esfuerzo cuenta aunque falles |
| Práctica del día completa | 25 | Una vez por día |

**Calidad:** cada error por turno baja el multiplicador de la conversación, hasta 0.6. Una sesión sin turnos no se castiga.

**Anti-trampa básica:** cada actividad tiene una clave única (`ref_key`) en `xp_events`. Un doble clic o un reintento de red no suma dos veces. Las historias solo dan XP la primera vez.

**Niveles:** el nivel 1 necesita 100 XP; cada nivel siguiente suma 25 más. Títulos: Curious → Explorer (5) → Storyteller (10) → Conversationalist (20) → Fluent Mind (35).

> Reglas de puntaje en `src/lib/xp.ts`, probadas en `src/__tests__/xp.test.ts`.

## Historias nuevas

Migración `supabase/migrations/0005_xp_and_story_library.sql`: nueve historias originales en inglés, con 3 preguntas cada una.

| Título | Nivel | Tema |
|---|---|---|
| The Lantern Keeper of Hollow Pass | B1 | Fantasía |
| The Dragon Who Collected Clocks | A2 | Fantasía, humor |
| The Missing Violin | B1 | Misterio |
| A Letter Without a Stamp | B2 | Misterio |
| The Habit Loop | A2 | Hábitos (cue, rutina, recompensa) |
| Rewiring a Mind | B2 | Neurociencia (neuroplasticidad) |
| The Night London Burned | B1 | Historia (1666) |
| One Small Step, 1969 | A2 | Historia (Apollo 11) |
| Two Faces in One Mirror | B2 | Retelling de una historia de dominio público |

**Sobre copyright:** no pude reproducir libros con copyright como *El Señor de los Anillos*, *Harry Potter* o *Deja de ser tú* (Joe Dispenza). Las historias de arriba son textos originales inspirados en esos géneros. Para libros con copyright, lo legal es enlazar a la fuente oficial o usar fragmentos muy cortos con cita.

Obras de dominio público que podemos adaptar (versiones propias, no copias): *Frankenstein* (1818), historias de Sherlock Holmes (1887–1927), *Treasure Island* (1883), *Alice's Adventures in Wonderland* (1865). Confirmar el estatus de dominio público en cada país antes de publicar.

## Navegación hacia atrás

- El botón atrás del navegador o del celular cierra la vista interna (lector, detalle, práctica) en vez de salir de la página. Implementado con `src/lib/useHistoryBack.ts` en Chunks, Listening, Reading, Roleplay, Sounds y Stories.
- Las conversaciones se guardan turno a turno. Si salís a mitad, al volver aparece **"Continue your last conversation?"** (48 h). Solo en inglés por ahora.

## Pendiente
- Retomar roleplay de la misma forma que la conversación.
- Desafío semanal y medallas por XP.
- Replicar XP, banner de retomar y textos de notificación en catalán.

## Revisión global (rama app-review)

- **Formato del coach:** respuesta = charla + `---FEEDBACK---` + secciones `**Título:** …`. `src/lib/coachFormat.ts` las separa; `CoachFeedback` muestra la tarjeta plegable. Sesiones viejas siguen igual.
- **Apertura del coach:** guion fijo por tema/nivel (`conversationOpeners.ts`), sin llamada a la IA.
- **Historias:** filtros por nivel y tema, orden `sortForLearner`, A1 (migración `0006_a1_stories.sql`).
- **Menú:** agrupado por habilidad; `/words` agregado.
- **Recordatorios:** `send-reminders` acepta `x-dry-run: 1` para probar sin enviar.
