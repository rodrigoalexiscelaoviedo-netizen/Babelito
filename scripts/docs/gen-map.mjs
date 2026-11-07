// Genera docs/CIERRE/03b-mapa-de-archivos.md. Los textos manuales (MANUAL) cubren archivos sin comentario. Se ejecuta con `npm run docs:cierre`.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd().split("\\").join("/"); // se ejecuta desde la raíz del proyecto
const strip = (s) => s.split(String.fromCharCode(13)).join("");

const MANUAL = {"supabase/functions/claude-proxy/index.ts":"El coach: recibe el chat desde la app, valida la sesión (JWT) y la cuota diaria, llama a Gemini (modelo principal y de respaldo) y devuelve el texto o un JSON. La clave de Gemini nunca llega al navegador.","src/pages/Chunks.tsx":"Biblioteca de expresiones por categoría; permite agregarlas al repaso y practicarlas en voz alta.","src/pages/DevGallery.tsx":"Galería de componentes para desarrollo (/dev/ui). No se muestra en producción.","src/pages/Grammar.tsx":"Lista de lecciones de gramática por nivel, con el progreso de cada una.","src/pages/Hub.tsx":"Pantalla de cada una de las 4 puertas (Hablar, Aprender, Recordar, Yo): herramienta principal grande y el resto como tarjetas. En Recordar muestra números reales.","src/pages/Lens.tsx":"Photo helper: foto de un menú o cartel → explicación en inglés simple, vocabulario y frases útiles (usa Gemini visión).","src/pages/Login.tsx":"Ingreso y registro con correo y contraseña.","src/pages/Mistakes.tsx":"Mis errores: ranking de errores recurrentes, ejemplos, palabras de pronunciación y ejercicios generados por IA.","src/pages/Plan.tsx":"Mi plan: tareas de hoy según tu actividad real, semana de 7 días y metas semanales.","src/components/AchievementCelebration.tsx":"Animación con confeti al desbloquear un logro.","src/components/Charts.tsx":"Gráficos SVG simples (línea/área) para la pantalla de progreso.","src/components/CoachFeedback.tsx":"Tarjeta plegable con la corrección del coach (Correction / More natural / Key tip).","src/components/Layout.tsx":"Estructura general de las pantallas: menú lateral o barra inferior y contenido.","src/components/LevelLadder.tsx":"Escalera de nivel: muestra el nivel actual, la evidencia que falta y metas de apoyo.","src/components/MultipleChoiceQuiz.tsx":"Quiz de opción múltiple reutilizable (Situaciones y Gramática).","src/components/ReportExtras.tsx":"Bloques extra de los informes de sesión (frases sugeridas, errores clave).","src/components/ThemeToggle.tsx":"Botón para cambiar entre modo Día y Noche.","src/components/VoiceOrb.tsx":"Orbe animado que muestra el estado de la voz (escuchando, hablando, pensando).","src/components/hubIcons.ts":"Relación entre nombres de ícono y los íconos de lucide-react para las puertas.","src/components/situationIcons.ts":"Relación entre nombres de ícono y los íconos de lucide-react para las situaciones.","src/lib/achievements.ts":"Definición de los logros y cómo se comprueba cada uno.","src/lib/hints.ts":"Pistas de respaldo cuando el coach no devuelve una sugerencia.","src/lib/monitoring.ts":"Inicializa Sentry (errores en producción) si hay DSN configurado.","src/lib/notifications.ts":"Permiso y suscripción a notificaciones push del dispositivo; guarda la suscripción en la base.","src/lib/sessionReport.ts":"Genera y guarda el informe al terminar una sesión (resumen, lo bien hecho, errores clave).","src/lib/soundsData.ts":"Contenido de los sonidos difíciles del inglés: IPA, cómo articularlos, pares mínimos y frase para repetir.","src/lib/stories.ts":"Tipos y funciones de acceso a historias y su progreso.","src/lib/useResumableSession.ts":"Detecta una conversación o roleplay a medias (últimas 48 h) para ofrecer retomarla.","src/lib/useVoicePrefs.ts":"Preferencias de voz del usuario (voz, velocidad, acento) leídas del perfil.","src/i18n/index.ts":"Configuración de i18next: elige el idioma de la interfaz según el idioma que se aprende."};
function purpose(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (MANUAL[rel]) return MANUAL[rel];
  const t = strip(fs.readFileSync(file, "utf8"));
  // Primer bloque /** ... */ o primeras líneas // al comienzo
  let m = t.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  let text = m ? m[1].split("\n").map((l) => l.replace(/^\s*\*\s?/, "").trim()).filter(Boolean).join(" ") : "";
  if (!text) {
    const lines = t.split("\n").filter((l) => l.trim().startsWith("//")).slice(0, 3).map((l) => l.replace(/^\s*\/\/\s?/, "").trim());
    text = lines.join(" ");
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > 200) text = text.slice(0, 197).replace(/\s\S*$/, "") + "…";
  return text;
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === "__tests__" ? [] : walk(p)) : /\.(tsx?|js)$/.test(e.name) ? [p] : [];
  });

const sections = [
  ["Pantallas (`src/pages`)", "src/pages"],
  ["Componentes (`src/components`)", "src/components"],
  ["Lógica y datos (`src/lib`)", "src/lib"],
  ["Contexto de sesión (`src/context`)", "src/context"],
  ["Textos de interfaz (`src/i18n`)", "src/i18n"],
  ["Funciones del servidor (`supabase/functions`)", "supabase/functions"],
  ["Scripts y pruebas de extremo a extremo", "scripts"],
];

let out = `# Mapa de archivos

Cada archivo del proyecto con su propósito, tomado de los comentarios del propio código. Generado automáticamente en el cierre.

`;
for (const [title, rel] of sections) {
  const files = walk(path.join(ROOT, rel)).sort();
  out += `## ${title}\n\n| Archivo | Para qué sirve |\n|---|---|\n`;
  for (const f of files) {
    const r = path.relative(ROOT, f).split(path.sep).join("/");
    out += `| \`${r}\` | ${purpose(f).replace(/\|/g, "\\|") || "—"} |\n`;
  }
  out += "\n";
}

// Pruebas
const tests = fs.readdirSync(path.join(ROOT, "src/__tests__")).filter((f) => /\.test\.tsx?$/.test(f)).sort();
out += `## Pruebas (\`src/__tests__\`, ${tests.length} archivos)\n\n${tests.map((f) => `- \`${f}\``).join("\n")}\n`;

fs.writeFileSync(path.join(ROOT, "docs/CIERRE/03b-mapa-de-archivos.md"), out);
console.log("ok", out.length);
