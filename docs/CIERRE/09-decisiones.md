# 9. Decisiones y por qué se tomaron

Lo que más se pierde con el tiempo no es el código, sino **por qué se hizo así**. Cada decisión está en formato: *qué se decidió → por qué → qué costó*.

## Producto y experiencia

**Cuatro puertas en vez de ~20 secciones.**
Hablar, Aprender, Recordar y Yo agrupan por lo que la persona quiere hacer. Antes había un menú largo organizado por cómo estaba construida la app. *Costo:* hubo que mover rutas a pantallas de grupo; las rutas originales no cambiaron.

**Inglés primero, español solo como apoyo.**
El repaso antiguo pedía traducir desde el español y se sentía como adivinanzas, además de hacer pensar en castellano. Ahora todo el ejercicio es en inglés y el español aparece solo al tocar "Need the Spanish?". La interfaz sigue al idioma que se aprende. *Costo:* hay que generar definiciones y ejemplos en inglés (una llamada a la IA por sesión).

**Cada actividad con un porqué y un siguiente paso.**
Leer, escuchar y dictar "no llevaban a ningún lado". Ahora cada una explica su objetivo y termina en un cierre: lectura → preguntas → palabras → repaso; escucha → patrones fallados → dictado; dictado → frases al repaso. *Costo:* más pantallas y más llamadas a la IA, mitigadas con caché.

**Una sola acción en la tarjeta de palabra.**
Antes mostraba definición en español, definición en inglés, ejemplo y tres estados (New/Learning/I know it). Aportaba poco y confundía. Ahora: traducción corta, un ejemplo y hasta 2 usos habituales, con un botón principal.

**Tarjeta "Up next" que abre la tarea directamente.**
La práctica diaria y el plan competían en Inicio. Se unificó la entrada: la tarjeta lleva directo a la próxima tarea del plan; la práctica diaria y la racha no cambiaron.

**Racha con congelaciones.** Dos al mes, para no castigar un día perdido.

**Solo cuenta como práctica una conversación con al menos 3 turnos reales.** Había dos umbrales distintos y sesiones cortas se cerraban sin contar y sin aviso.

## Coach e IA

**El coach corrige como máximo 2 errores por turno.** Más abruma y la persona deja de hablar.

**Apertura del coach con guion fijo.** Antes la app mandaba un mensaje falso "como si lo hubieras escrito vos" y gastaba un turno. Ahora abre el coach con una pregunta concreta, sin IA.

**Todas las llamadas a la IA pasan por una función del servidor.** La clave de Gemini nunca llega al navegador; la función valida la sesión y aplica una cuota diaria por persona.

**Respuestas en JSON garantizado** (`json: true`) para todo lo que se procesa por código. Reduce errores de lectura de respuestas.

**Razonamiento desactivado en audio y visión.** Con el razonamiento de Gemini 2.5 activo, el modelo gastaba el presupuesto de salida pensando y el JSON llegaba cortado ("Respuesta no válida del coach").

**Caché compartida de definiciones.** Cada palabra se pide a la IA una sola vez para todos los usuarios. Ahorra cuota.

**Preguntas de lectura generadas y guardadas en el navegador.** Un texto = una llamada; los textos pegados por la persona se identifican con un resumen del contenido.

## Nivel y test

**El nivel combina un test inicial y evidencia diaria.** El test fija el punto de partida; después `leveling.ts` ajusta con repaso (60 %), conversación (30 %) y test (10 %).

**El nivel automático depende del diagnóstico.** No sube más de 2 escalones sobre lo diagnosticado ni baja más de 1 bajo él. *Consecuencia:* un test mal medido limita todo lo que viene después. Se vio en las pruebas del propio proyecto: en una semana el mismo perfil pasó por B1, B2, A1 y A2 según qué test se hizo y cuándo.

**El test se corta al no sostener un escalón (60 %).** Seguir con preguntas más difíciles solo frustra. *Problema encontrado:* con 5 preguntas por nivel, 2 de 5 puede ser mala suerte y cortaba el test demasiado pronto.

**Segunda oportunidad.** Con exactamente 2 de 5, se hacen 3 preguntas más del mismo nivel y se decide con 8 (5 de 8). No se activa tras 3 o más "I don't know", que indican que el nivel todavía no llegó.

**Botón "I don't know".** Evita el azar: una respuesta al tuntún (25 %) contaba como acierto.

**Lo oral mueve el nivel como máximo un escalón.** Antes el resultado era el mínimo entre escrito, lectura y respuesta abierta, y una sola lectura floja bajaba a cualquiera hasta A1. Ahora la lectura se puntúa por palabras acertadas y lo escrito es el ancla.

**Quien empieza de cero se salta lo hablado.** No necesita leer en voz alta a ese nivel.

**Se puede elegir el nivel a mano.** El test no puede ser un muro sin salida.

## Voz

**Voz neural de Azure con respaldo a la del navegador.** Suena natural; si falla o no hay clave, la app sigue funcionando.

**Puntaje de pronunciación real** (Azure) en lugar de comparar solo el texto reconocido. Sin Azure se conserva la comparación palabra por palabra.

**Live con credencial de un solo uso y WebSocket directo.** Se eliminó un proxy de WebSocket anterior porque el JWT iba en la URL y quedaba en los registros. La credencial de un solo uso es segura de entregar al navegador. Requirió ampliar la CSP (`connect-src`) y servir el worklet de audio como archivo estático (`script-src 'self'` no admite scripts en línea ni blobs).

## Diseño

**Tema Día por defecto, con Noche conservado.** La app original era azul noche con coral, con halos difusos, etiquetas mono en mayúsculas y degradés: un patrón repetido. El tema Día (papel crema, tinta oscura, tangerina, botones tipo tecla) le da identidad propia. Noche se mantiene para quien lo prefiera.

**Colores como variables CSS.** Todos los colores de Tailwind salen de variables (`--ink-900`, `--coral`…), así cambiar de tema o de paleta no obliga a tocar pantallas.

**Un color por puerta.** Se reconoce dónde estás de un vistazo.

**Sombras en capas y botones que se hunden.** Más tacto y más profundidad que bordes planos.

## Datos y operación

**Cada actividad con XP tiene clave única (`ref_key`).** Un doble clic o un reintento de red no suma dos veces.

**RLS en todas las tablas.** Cada persona solo ve lo suyo.

**`commit ≠ push ≠ deploy`.** Las migraciones y las funciones se publican a mano, separadas del frontend. Evita que un push rompa la base sin querer.

**Las migraciones no son la fuente de verdad.** El esquema de producción se armó en parte a mano. La verdad es la base real; por eso este cierre incluye cómo consultarla (ver `05-base-de-datos.md`).

**Errores de guardado visibles.** Un bug que existió desde el principio (la columna `phonetic` inexistente) pasó desapercibido porque el error se perdía en silencio. Ahora `upsertWord` lanza el error y la tarjeta lo muestra.

**Contenido original.** Las historias de `0005` y `0006` son textos propios, no copias de libros con copyright. Para obras con copyright se enlaza a la fuente o se usan fragmentos muy cortos con cita. Obras de dominio público adaptables (versiones propias): *Frankenstein*, Sherlock Holmes, *Treasure Island*, *Alice's Adventures in Wonderland*; confirmar el estatus en cada país.

**Catalán en pausa.** Hasta cerrar la versión en inglés no se hicieron cambios allí. Muchas herramientas nuevas se ocultan en catalán.

## Herramientas de trabajo evaluadas

- **Skills de diseño de terceros** (Taste Skill, Image to Code): se evaluaron y no se instalaron. Están pensadas para webs y landings, traen scripts con Node y Chrome, y la app ya tenía skills equivalentes habilitadas. Se tomaron sus ideas.
- **Playwright**: se usa para pruebas de extremo a extremo y para revisar el sitio en varios anchos.
- **Identidad de commits:** correo `noreply` de GitHub y sin coautor, para no bloquear Vercel.
