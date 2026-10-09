/**
 * Seed de contenido catalán → Supabase.
 *
 * Reemplaza a supabase/migrations/0003_seed_catalan.sql, que tenía DOS fallas:
 *   1. No insertaba nada (y el SQL Editor hacía rollback silencioso de las 97
 *      filas si una sola fallaba, sin decir cuál).
 *   2. Más grave: guardaba el catalán en la columna equivocada. La app
 *      pronuncia `chunks.english` (Chunks.tsx:169 → speak(chunk.english)) y lo
 *      usa como ítem de repaso (Chunks.tsx:69). O sea que en un curso de
 *      catalán el alumno habría practicado pronunciación INGLESA. Ningún
 *      count(*) lo habría detectado.
 *
 * Mapeo correcto para chunks:
 *   english  ← texto CATALÁN   (lo que se pronuncia y se practica)
 *   spanish  ← la glosa        (lo que se muestra como pista)
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."; npx tsx scripts/seed/run-catalan.ts
 *
 * La service_role key se pasa en el momento y NO se guarda en .env.local,
 * respetando lo que documenta .env.local.example: esa key no vive cerca del
 * front. Solo la URL se lee de .env.local.
 *
 * Es idempotente: borra el contenido con language='ca' y lo reinserta.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { catalanStories, catalanChunks } from "./catalan-data";

const LANG = "ca";
const BATCH = 50;

// ─────────────────────────────────────────────────────────────────────────
// Credenciales
// ─────────────────────────────────────────────────────────────────────────

/** Lee una var de .env.local sin sumar dotenv como dependencia. */
function fromEnvLocal(key: string): string {
  let raw: string;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return "";
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && m[1] === key) return m[2].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = process.env.VITE_SUPABASE_URL || fromEnvLocal("VITE_SUPABASE_URL");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url) {
  console.error("✖ Falta VITE_SUPABASE_URL (ni en el entorno ni en .env.local).");
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    "✖ Falta SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Se pasa en el momento, no se guarda. En PowerShell:\n" +
      '    $env:SUPABASE_SERVICE_ROLE_KEY="..."; npx tsx scripts/seed/run-catalan.ts\n' +
      "  La sacás de Supabase → Settings → API → service_role.",
  );
  process.exit(1);
}

// La service_role key bypassa RLS a propósito: el contenido es global
// (user_id = null) y la policy stories_write exige auth.uid() = user_id, que
// con la anon key nunca se cumple para filas globales.
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────────────────────────────────────────────────────
// Mapeo a las columnas reales de cada tabla
// ─────────────────────────────────────────────────────────────────────────

const storyRows = catalanStories.map((s) => ({
  user_id: null, // global: lo lee cualquiera (policy stories_read)
  level: s.level,
  title: s.title,
  content: s.content,
  topic: s.topic,
  questions: s.questions,
  source: "ai_generated",
  language: LANG,
}));

const chunkRows = catalanChunks.map((c) => ({
  // `category` es NOT NULL y el contenido fuente no la trae. Queda "general"
  // hasta agrupar los 84 diálogos por tema (pendiente, ver nota al final).
  category: "general",
  english: c.content, // ← CATALÁN: es lo que speak() pronuncia
  spanish: c.english, // ← glosa mostrada como pista
  language: LANG,
}));

// ─────────────────────────────────────────────────────────────────────────
// Inserción con diagnóstico por fila
// ─────────────────────────────────────────────────────────────────────────

/**
 * Inserta en lotes. Si un lote falla, reintenta fila por fila para señalar
 * exactamente cuál rompe y con qué error de Postgres — que es justo lo que el
 * SQL Editor no nos decía.
 */
async function insertAll(table: string, rows: Record<string, unknown>[]) {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(slice);

    if (!error) {
      inserted += slice.length;
      continue;
    }

    console.error(`\n  ⚠ Lote ${i}–${i + slice.length - 1} falló. Aislando fila...`);
    for (let j = 0; j < slice.length; j++) {
      const { error: rowError } = await supabase.from(table).insert([slice[j]]);
      if (rowError) {
        console.error(`  ✖ Fila ${i + j} de ${table}:`);
        console.error(`    ${rowError.message}`);
        if (rowError.details) console.error(`    details: ${rowError.details}`);
        if (rowError.hint) console.error(`    hint: ${rowError.hint}`);
        console.error(`    datos: ${JSON.stringify(slice[j]).slice(0, 300)}`);
        return { inserted, failed: true };
      }
      inserted++;
    }
  }

  return { inserted, failed: false };
}

async function reseed(table: string, rows: Record<string, unknown>[]) {
  console.log(`\n▸ ${table} (${rows.length} filas)`);

  const { error: delError } = await supabase.from(table).delete().eq("language", LANG);
  if (delError) {
    console.error(`  ✖ No se pudo limpiar ${table}: ${delError.message}`);
    return false;
  }
  console.log(`  · limpiado language='${LANG}'`);

  const { inserted, failed } = await insertAll(table, rows);
  console.log(`  ${failed ? "✖" : "✓"} insertadas ${inserted}/${rows.length}`);
  return !failed;
}

async function verify(table: string, expected: number) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("language", LANG);

  if (error) {
    console.log(`  ${table}: no verificable (${error.message})`);
    return false;
  }
  const ok = count === expected;
  console.log(`  ${ok ? "✓" : "✖"} ${table}: ${count} filas ca (esperadas ${expected})`);
  return ok;
}

async function main() {
  console.log(`Seed catalán → ${url}`);

  const okStories = await reseed("stories", storyRows);
  const okChunks = await reseed("chunks", chunkRows);

  console.log("\n─── verificación (releída de la BD) ───");
  const vStories = await verify("stories", storyRows.length);
  const vChunks = await verify("chunks", chunkRows.length);

  const allOk = okStories && okChunks && vStories && vChunks;
  console.log(allOk ? "\n✓ Seed completo.\n" : "\n✖ Seed incompleto — ver errores arriba.\n");
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("✖ Error inesperado:", err);
  process.exit(1);
});
