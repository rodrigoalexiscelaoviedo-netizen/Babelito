// Convierte la documentación de docs/CIERRE a PDF (dos archivos). Se ejecuta con `npm run docs:cierre`.
// Usa `marked` para pasar Markdown a HTML y Playwright (Edge/Chrome instalado) para imprimir el PDF.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "docs/CIERRE");
const OUT = path.join(DIR, "PDF");
const strip = (s) => s.split(String.fromCharCode(13)).join("");
fs.mkdirSync(OUT, { recursive: true });

const CSS = `
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Inter, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1b1a17; }
  h1 { font-size: 22pt; margin: 0 0 8pt; padding-bottom: 6pt; border-bottom: 3px solid #e8460f; page-break-before: always; }
  h1.first { page-break-before: avoid; }
  h2 { font-size: 15pt; margin: 18pt 0 6pt; color: #b03006; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  code { font-family: Consolas, "JetBrains Mono", monospace; font-size: 9pt; background: #f0eadd; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f7f3ea; border: 1px solid #e8e1d2; border-radius: 6px; padding: 8pt; font-size: 8.5pt; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9pt; }
  th, td { border: 1px solid #d6cdba; padding: 4pt 6pt; vertical-align: top; word-break: break-word; }
  th { background: #f0eadd; text-align: left; }
  tr { page-break-inside: avoid; }
  blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 4px solid #f2a20c; background: #fff8e6; }
  p:has(+ p img) { break-after: avoid; page-break-after: avoid; }
  p img { display: block; max-height: 150mm; width: auto; }
  img { max-width: 100%; border: 1px solid #e8e1d2; border-radius: 6px; margin: 4pt 0; page-break-inside: avoid; }
  ul, ol { padding-left: 18pt; }
  hr { border: 0; border-top: 1px solid #d6cdba; margin: 12pt 0; }
  .cover { page-break-after: always; height: 240mm; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 40pt; border: 0; page-break-before: avoid; margin: 0; }
  .cover p { font-size: 14pt; color: #686358; }
  .cover .bar { width: 80pt; height: 6pt; background: #e8460f; margin: 12pt 0; }
`;

const read = (rel) => strip(fs.readFileSync(path.join(DIR, rel), "utf8"));

function toHtml(title, subtitle, files) {
  const body = files
    .map((f, i) => marked.parse(read(f)).replace("<h1>", i === 0 ? '<h1 class="first">' : "<h1>"))
    .join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>
<div class="cover"><h1>${title}</h1><div class="bar"></div><p>${subtitle}</p><p>Cierre del proyecto · 7 de noviembre de 2026</p></div>
${body}</body></html>`;
}

const guia = [
  "LEEME.md",
  "01-vision-general.md",
  "02-arquitectura.md",
  "03-pantallas-y-funciones.md",
  "03b-mapa-de-archivos.md",
  "05-base-de-datos.md",
  "06-funciones-servidor.md",
  "07-servicios-y-costos.md",
  "08-recrear-desde-cero.md",
  "09-decisiones.md",
  "10-pendientes.md",
  "11-diseno.md",
  "12-competencia-y-referencias.md",
];
const contenidos = fs
  .readdirSync(path.join(DIR, "04-contenido"))
  .filter((f) => f.endsWith(".md"))
  .sort()
  .map((f) => `04-contenido/${f}`);

const jobs = [
  { name: "Babelito-Guia-de-cierre.pdf", html: toHtml("Babelito", "Guía de cierre: cómo está construida y cómo funciona la app", guia) },
  { name: "Babelito-Contenidos.pdf", html: toHtml("Babelito · Contenidos", "Textos, historias, preguntas, situaciones, gramática y más", contenidos) },
];

let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  browser = await chromium.launch();
}
for (const job of jobs) {
  const tmp = path.join(DIR, `_tmp-${job.name}.html`);
  fs.writeFileSync(tmp, job.html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await page.pdf({
    path: path.join(OUT, job.name),
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#686358;font-family:Arial">Babelito · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
  });
  await page.close();
  fs.unlinkSync(tmp);
  console.log("PDF", job.name, (fs.statSync(path.join(OUT, job.name)).size / 1024).toFixed(0) + " KB");
}
await browser.close();
