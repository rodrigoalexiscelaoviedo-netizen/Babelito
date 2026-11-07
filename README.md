# Babelito 🗣️

Entrenador de idiomas con IA para hispanohablantes: conversación con un coach que corrige, lectura y escucha interactivas, repaso espaciado y un test de nivel. Hoy aprende **inglés** (versión completa); el **catalán** está en pausa.

> 📚 **Toda la documentación está en [`docs/CIERRE/`](docs/CIERRE/LEEME.md)** (también en PDF en `docs/CIERRE/PDF/`): cómo está construida, cómo funciona, contenidos, base de datos, funciones del servidor, servicios, cómo recrearla y decisiones.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router + i18next (PWA instalable)
- **Backend:** Supabase (Postgres + Auth + Edge Functions + pg_cron)
- **IA:** Gemini vía Edge Functions (`claude-proxy`, `gemini-tools`). La clave nunca llega al navegador.
- **Voz:** Azure Speech (voz neural y puntaje de pronunciación) con respaldo a la Web Speech API
- **Recordatorios:** Web Push con envío desde el servidor
- **Monitoreo:** Sentry (opcional)
- **Pruebas:** Vitest (206) · Playwright · ESLint
- **Publicación:** Vercel (frontend) · Supabase (base y funciones)

## Desarrollo

```bash
npm install
cp .env.local.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript estricto |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run e2e` | Playwright (requiere `E2E_EMAIL` y `E2E_PASSWORD`) |
| `npm run build` | Typecheck + build de producción |
| `npm run seed:catalan` | Carga el contenido catalán inicial (requiere la service role key) |
| `npm run docs:cierre` | Regenera los contenidos, el mapa de archivos y los PDF de `docs/CIERRE/` |

## Publicar

Las migraciones SQL y las Edge Functions **no** se publican con `git push`: se hacen a mano. Solo el frontend se publica solo (Vercel, al pushear a `main`). Pasos completos en [`docs/CIERRE/08-recrear-desde-cero.md`](docs/CIERRE/08-recrear-desde-cero.md).

## Estructura

```
src/
  pages/        una pantalla por módulo
  components/   piezas compartidas
  lib/          lógica y contenido: repaso, nivel, XP, coach, voz…
  context/      sesión y perfil
  i18n/         textos de la interfaz (en, ca)
  __tests__/    pruebas
supabase/
  functions/    claude-proxy · gemini-tools · speech-tts · pronunciation-assess · send-reminders
  migrations/   0001…0008
scripts/        seed del catalán y generador de la documentación
e2e/            pruebas de extremo a extremo
docs/CIERRE/    documentación completa
```

## Idiomas

La interfaz sigue al idioma que se aprende. Las **ayudas de comprensión** van en **español neutro**. El audio usa siempre una voz del idioma del contenido.
