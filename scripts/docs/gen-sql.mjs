// Genera las historias y expresiones del inglés desde los SQL. Se ejecuta con `npm run docs:cierre`.
import fs from "node:fs";

const ROOT = process.cwd().split("\\").join("/"); // se ejecuta desde la raíz del proyecto
const OUT = ROOT + "/docs/CIERRE/04-contenido";
const read = (p) => fs.readFileSync(`${ROOT}/${p}`, "utf8").split(String.fromCharCode(13)).join("");

// ── Historias ────────────────────────────────────────────────────────────────
const stories = [];

// 0005 y 0006: contenido entre $t$ ... $t$ y preguntas entre $q$ ... $q$
for (const file of ["supabase/migrations/0005_xp_and_story_library.sql", "supabase/migrations/0006_a1_stories.sql"]) {
  const sql = read(file);
  const re = /\('[^']*',\s*'((?:[^']|'')+)',\s*'([ABC][12])',\s*'((?:[^']|'')+)',\s*\$t\$([\s\S]*?)\$t\$,[\s\S]*?\$q\$([\s\S]*?)\$q\$/g;
  let m;
  while ((m = re.exec(sql))) stories.push({ file, title: m[1].replace(/''/g, "'"), level: m[2], topic: m[3].replace(/''/g, "'"), content: m[4].trim(), questions: JSON.parse(m[5]) });
}

// seeds_stories.sql: contenido y preguntas entre comillas simples
{
  const sql = read("supabase/seeds_stories.sql");
  const re = /gen_random_uuid\(\),\s*'((?:[^']|'')+)',\s*'([ABC][12])',\s*'((?:[^']|'')+)',\s*'((?:[^']|'')+)',\s*'[^']*',\s*(?:null|NULL),\s*'((?:[^']|'')+)'/g;
  let m;
  while ((m = re.exec(sql))) {
    let q = [];
    try {
      q = JSON.parse(m[5].replace(/''/g, "'"));
    } catch {
      /* sin preguntas legibles */
    }
    stories.push({ file: "supabase/seeds_stories.sql", title: m[1].replace(/''/g, "'"), level: m[2], topic: m[3].replace(/''/g, "'"), content: m[4].replace(/''/g, "'").trim(), questions: q });
  }
}

const body = stories
  .map(
    (s) => `## ${s.title} (${s.level}) · ${s.topic}

_Fuente: \`${s.file}\`_

${s.content}

**Preguntas de comprensión**

${s.questions.map((q) => `- ${q.question}\n${q.options.map((o, i) => `  - ${i === q.correct_index ? "✔" : "·"} ${o}`).join("\n")}`).join("\n")}`
  )
  .join("\n\n");

fs.writeFileSync(
  `${OUT}/08-historias-en-ingles.md`,
  `# Historias en inglés (${stories.length})

Pantalla: \`/stories\`. Viven en la tabla \`stories\` de Supabase y se cargaron desde tres archivos SQL (indicados en cada historia). Cada una trae 3 preguntas de comprensión. Además, la app puede generar historias nuevas con el coach.

Las historias de \`0005\` y \`0006\` son textos originales escritos para Babelito (no reproducen libros con copyright).

${body}
`
);
console.log("historias", stories.length);

// ── Expresiones (chunks) del inglés ─────────────────────────────────────────
{
  const sql = read("supabase/migrations/0001_init_schema.sql");
  const start = sql.indexOf("insert into public.chunks");
  const block = sql.slice(start);
  const re = /\('((?:[^']|'')+)','((?:[^']|'')+)','((?:[^']|'')+)','((?:[^']|'')+)','((?:[^']|'')+)'\)/g;
  const rows = [];
  let m;
  while ((m = re.exec(block))) rows.push(m.slice(1).map((x) => x.replace(/''/g, "'")));
  const byCat = {};
  for (const r of rows) (byCat[r[0]] ??= []).push(r);
  fs.writeFileSync(
    `${OUT}/09-expresiones-en-ingles.md`,
    `# Biblioteca de expresiones en inglés (${rows.length})

Pantalla: \`/chunks\`. Tabla \`chunks\` (columnas: categoría, inglés, español, ejemplo, versión británica). Origen: \`supabase/migrations/0001_init_schema.sql\`. Se pueden agregar al repaso y se exportan a Anki desde Perfil.

${Object.entries(byCat)
  .map(([c, rs]) => `## ${c} (${rs.length})\n\n${rs.map((r) => `- **${r[1]}** — ${r[2]}\n  - Ejemplo: ${r[3]}\n  - Británico: ${r[4]}`).join("\n")}`)
  .join("\n\n")}
`
  );
  console.log("chunks", rows.length);
}
