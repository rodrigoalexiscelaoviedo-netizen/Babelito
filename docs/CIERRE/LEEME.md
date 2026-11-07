# Babelito · Documentación de cierre

Fecha de cierre: **7 de noviembre de 2026**. Estado: versión en inglés completa y publicada; catalán pausado.

Esta carpeta guarda **todo lo que hace falta para entender, mantener o recrear la app**: cómo está construida, cómo funciona, qué contenido tiene y qué decisiones se tomaron. No contiene datos de usuarios ni claves.

## Cómo leerla

| Si querés… | Abrí |
|---|---|
| Entender qué es la app en 5 minutos | `01-vision-general.md` |
| Ver cómo está construida | `02-arquitectura.md` |
| Saber qué hace cada pantalla y cada regla (XP, nivel, repaso) | `03-pantallas-y-funciones.md` |
| Encontrar qué hace cada archivo del código | `03b-mapa-de-archivos.md` |
| Leer los contenidos (textos, historias, preguntas…) | carpeta `04-contenido/` |
| Ver las tablas reales de la base de datos | `05-base-de-datos.md` |
| Entender las funciones del servidor | `06-funciones-servidor.md` |
| Saber qué servicios usa y cuánto cuestan | `07-servicios-y-costos.md` |
| Volver a montar todo desde cero | `08-recrear-desde-cero.md` |
| Entender por qué se hizo así | `09-decisiones.md` |
| Ver lo que quedó pendiente y los bugs conocidos | `10-pendientes.md` |
| Ver colores, tipografías y capturas | `11-diseno.md` |
| Comparar con otras apps de idiomas | `12-competencia-y-referencias.md` |

## Contenido de `04-contenido/`

| Archivo | Qué tiene |
|---|---|
| `01-textos-de-lectura.md` | 6 textos de lectura en inglés (A2–B2) y los de catalán |
| `02-test-de-nivel.md` | Las 26 preguntas del test, 15 de desempate, frases de lectura oral y cómo se decide el nivel |
| `03-situaciones.md` | 18 situaciones (entrevista, aeropuerto, restaurante…) con frases, diálogo, quiz y roleplay |
| `04-gramatica.md` | 12 lecciones de gramática |
| `05-sonidos-y-escucha.md` | Sonidos difíciles del inglés y patrones de habla conectada |
| `06-roleplay-temas-y-frases.md` | Escenas de roleplay, temas de conversación, frases de pronunciación, logros y tipos de error |
| `07-contenido-catalan-sembrado.md` | 15 historias, 80 expresiones y 200 palabras en catalán (pausado) |
| `08-historias-en-ingles.md` | 25 historias en inglés con sus preguntas |
| `09-expresiones-en-ingles.md` | Biblioteca de expresiones del inglés |

## Dónde está todo en el proyecto

```
Babelito/
├─ docs/CIERRE/            ← esta documentación (en Markdown)
├─ docs/CIERRE/PDF/        ← la misma documentación en PDF
├─ src/                    ← el código de la app
├─ supabase/               ← funciones del servidor y migraciones SQL
├─ public/                 ← íconos, manifiesto y archivos estáticos
└─ README.md               ← entrada rápida al proyecto
```

## Nota sobre los contenidos

Los archivos de `04-contenido/` se **generaron leyendo el código y los SQL** en el momento del cierre, así que reflejan exactamente lo que había. Si el contenido cambia después, hay que volver a generarlos (ver `08-recrear-desde-cero.md`, sección "Regenerar la documentación").
