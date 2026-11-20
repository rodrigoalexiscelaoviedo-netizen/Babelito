# Babelito — instrucciones para Claude

App de aprendizaje de inglés (React 18 + Vite + TypeScript + Tailwind 3 + Supabase + Gemini). Producción: babelito.vercel.app.

## Equipo de trabajo (obligatorio)

Cada pantalla o componente nuevo o modificado se revisa con estos cinco roles antes de darlo por terminado. No hace falta anunciarlos por separado, pero el resultado tiene que cumplir cada uno.

**1. Director de Arte & UI**
- Paleta coherente con los tokens de `src/index.css` y `tailwind.config.js` (`--paper`, `--coral`, `--mint`, `--gold`, `--ink-*`). No inventar colores sueltos.
- Tipografía con jerarquía clara (`.page-title`, `.eyebrow`, texto muted). Espaciado generoso.
- Evitar plantillas genéricas de IA: nada de gradientes morados ni tarjetas idénticas repetidas sin intención.
- Respetar los dos temas (Día y Noche).

**2. Arquitecto UX**
- Flujo claro: qué hace la persona, qué ve después y cómo vuelve atrás (`useHistoryBack`).
- Estados completos en cada pantalla: carga (skeleton o `Loader`), vacío, error y éxito.
- Mobile-first. Probar a 375 px sin scroll horizontal.

**3. Ingeniero Frontend**
- Componentes accesibles: `role`, `aria-label`, `aria-pressed`, foco visible, operables con teclado (Enter/Espacio), contraste WCAG AA (4,5:1 en texto pequeño).
- Para componentes nuevos de interfaz, usar shadcn/ui + Tailwind cuando aplique. Los componentes existentes de la app no se reescriben solo por eso.
- Animaciones suaves y respetar `prefers-reduced-motion`.
- Verificación visual real con Playwright MCP antes de cerrar un cambio de UI (captura en claro y oscuro, y en móvil).
- Tipos: toda tabla nueva de Supabase se tipa en `src/lib/types.ts` (o `types.ts` equivalente) en el mismo commit que la crea.

**4. Especialista IA & Producto**
- Integraciones limpias: las claves de Gemini y Claude viven en secretos de las Edge Functions de Supabase, nunca en el cliente.
- Latencia percibida baja: streaming o skeleton mientras la IA responde. Nunca una pantalla en blanco.
- Utilidad real: cada función tiene que ayudar a aprender. Si no enseña nada medible, se cuestiona antes de construirla.

**5. Estratega SEO & Conversión**
- Metadatos completos en `index.html` (title, description, Open Graph) para las páginas públicas (login, landing).
- Semántica HTML: `main`, `nav`, `h1` único por pantalla, `button` para acciones y `a` para navegación.
- Velocidad: no cargar librerías enteras para un icono, no importar módulos que no se usan.
- Un llamado a la acción claro por pantalla.

## Verificación antes de cerrar

- `npx tsc --noEmit -p tsconfig.json` sin errores.
- `npx vitest run` en verde.
- `npx eslint` sobre los archivos cambiados sin errores (warnings previos se pueden dejar, pero no nuevos).
- Cambio visual: captura con Playwright en claro, oscuro y móvil.

## Convenciones del proyecto

- Idioma de la interfaz: inglés por defecto, catalán cuando `learning_language === "ca"` (solo donde ya existe).
- Lógica de sugerencias y reglas: en código. Textos de contenido: en la base de datos.
- Documentación de decisiones de diseño en `docs/` (por ejemplo `docs/DISENO-live-unificado.md`).
- Commits: seguir la memoria de identidad de commits de este proyecto.
