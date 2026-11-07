# 1. Visión general

## Qué es

**Babelito** es un entrenador de idiomas con IA, pensado para hispanohablantes que quieren aprender **inglés** (y, en pausa, catalán). Se usa desde el navegador o instalada como app en el celular (PWA). La idea central: **hablar mucho, recibir corrección clara y repasar lo aprendido justo antes de olvidarlo**.

Todo se adapta al nivel de la persona (A1 a C1) y a los errores que comete.

## Para quién

Una persona adulta, hispanohablante, que ya sabe algo de inglés o empieza de cero y quiere avanzar con poco tiempo por día (unos 5 a 15 minutos).

## Las cuatro ideas que la sostienen

1. **Hablar primero.** Conversación con un coach que corrige como máximo 2 errores por turno, llamada de voz y roleplay de situaciones reales.
2. **Todo lo que aprendés vuelve.** Lo que guardás al leer, escuchar o hablar entra a un repaso espaciado (SRS). Nada queda en el aire.
3. **Inglés primero, español de apoyo.** La interfaz y el repaso están en inglés; el español aparece solo como ayuda a pedido ("Need the Spanish?") y en las explicaciones de errores.
4. **Cada actividad tiene un porqué y un siguiente paso.** Las pantallas explican para qué sirven y terminan con un cierre (preguntas, repaso, qué sigue).

## El recorrido de una persona

1. **Registro e ingreso** (correo y contraseña).
2. **Ficha previa** (`/onboarding`): idioma a aprender, objetivo, nivel que cree tener, intereses.
3. **Test de nivel** (`/diagnostic`): preguntas escritas, lectura en voz alta y una pregunta hablada. Se puede saltar eligiendo el nivel a mano.
4. **Inicio**: práctica del día, racha y la tarjeta "Up next" con lo más conveniente ahora.
5. **Las cuatro puertas** del menú:
   - **Speak** — conversación, situaciones, roleplay, pronunciación, corrector de textos.
   - **Learn** — historias, lectura, escucha, dictado, foto de un cartel.
   - **Remember** — repaso diario, mis palabras, biblioteca de frases, gramática, mis errores.
   - **Me** — progreso y nivel, mi plan, perfil.
6. **Recordatorios** diarios por notificación (opcional).

## Cifras del proyecto al cierre

| Dato | Valor |
|---|---|
| Primer commit / último | 28 de junio de 2026 / 7 de noviembre de 2026 |
| Commits | 136 |
| Líneas de código de la app (`src/`, sin pruebas) | ≈ 22.000 |
| Pantallas | 26 |
| Funciones del servidor | 5 |
| Migraciones SQL | 8 |
| Pruebas automáticas | 206 en 26 archivos |
| Contenido en inglés | 6 textos, 25 historias, 18 situaciones, 12 lecciones de gramática, 26+15 preguntas de nivel, 16 expresiones base |
| Contenido en catalán (pausado) | 15 historias, 80 expresiones, 200 palabras, 12 sonidos, 10 patrones de escucha |

## Dónde vive en producción

| Qué | Dónde |
|---|---|
| App | `https://babelito.vercel.app` (Vercel, proyecto `babelito`) |
| Código | GitHub: `rodrigoalexiscelaoviedo-netizen/Babelito`, rama `main` |
| Base de datos y funciones | Supabase, proyecto **Babelito** (id `gxmarhrrvhjtpzvaqoll`) en la organización "APPS" |

> En esa organización hay más de un proyecto de Supabase. El de Babelito es el que se llama **Babelito**, con el id indicado arriba.
