// Genera docs/CIERRE/04-contenido/* leyendo el código. Se ejecuta con `npm run docs:cierre`.
process.env.VITE_SUPABASE_URL ??= "http://localhost";
process.env.VITE_SUPABASE_ANON_KEY ??= "docs";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd().split("\\").join("/"); // se ejecuta desde la raíz del proyecto
const OUT = path.join(ROOT, "docs/CIERRE/04-contenido");
fs.mkdirSync(OUT, { recursive: true });

const imp = (p: string) => import(/* @vite-ignore */ ROOT + "/src/lib/" + p);
const write = (name: string, body: string) => {
  fs.writeFileSync(path.join(OUT, name), body.replace(/\n{3,}/g, "\n\n").trim() + "\n");
  console.log("ok", name, body.length);
};
const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
const tryDump = async (name: string, fn: () => Promise<string>) => {
  try {
    write(name, await fn());
  } catch (e) {
    console.log("FALLO", name, (e as Error).message.slice(0, 120));
  }
};

// ── Textos de lectura ───────────────────────────────────────────────────────
await tryDump("01-textos-de-lectura.md", async () => {
  const m = await imp("readingTexts.ts");
  const fmt = (arr: any[], title: string) =>
    `## ${title}\n\n` + arr.map((t) => `### ${t.title} (${t.level}) · ${t.author}\n\n${t.content}`).join("\n\n");
  return `# Textos de lectura\n\nPantalla: \`/reading\`. Archivo: \`src/lib/readingTexts.ts\`. Cada texto se lee tocando palabras y frases y cierra con tres preguntas de comprensión generadas por el coach.\n\n${fmt(m.READING_TEXTS, "Inglés")}\n\n${fmt(m.READING_TEXTS_CA, "Catalán (pausado)")}`;
});

// ── Test de nivel ───────────────────────────────────────────────────────────
await tryDump("02-test-de-nivel.md", async () => {
  const q = await imp("diagnosticQuestions.ts");
  const o = await imp("oralDiagnostic.ts");
  const fmtQ = (qs: any[]) =>
    qs
      .map((x) => `- **[${x.level} · ${x.skill}] ${x.prompt}**\n${x.options.map((op: string, i: number) => `  - ${i === x.answer ? "**✔**" : "·"} ${op}`).join("\n")}`)
      .join("\n");
  return `# Test de nivel (diagnóstico)

Pantalla: \`/diagnostic\`. Archivos: \`src/lib/diagnosticQuestions.ts\`, \`src/lib/oralDiagnostic.ts\`, \`src/pages/Diagnostic.tsx\`.

## Cómo decide el nivel

1. **Parte escrita** — preguntas de opción múltiple ordenadas de A1 a C1 (5 por nivel). Al cerrar un nivel con menos de 60 % de aciertos, el test se corta. El nivel es el más alto sostenido antes del corte.
2. **Segunda oportunidad** — si un nivel queda justo en 2 de 5, se hacen 3 preguntas de desempate del mismo nivel y se decide con las 8 (hace falta 5 de 8). No se activa si la persona respondió "I don't know" 3 veces o más.
3. **Parte oral** (si hay micrófono y no es principiante) — lectura en voz alta de 3 frases y una pregunta abierta. La lectura se puntúa por palabras acertadas; la respuesta abierta la evalúa el coach.
4. **Combinación** — el nivel escrito es el ancla; lo oral lo mueve como máximo un escalón.

## Banco principal (inglés, ${q.DIAGNOSTIC.length} preguntas)

${fmtQ(q.DIAGNOSTIC)}

## Preguntas de desempate (inglés)

${fmtQ(q.ALL_TIEBREAKERS)}

## Banco catalán (pausado, ${q.DIAGNOSTIC_CA.length} preguntas)

${fmtQ(q.DIAGNOSTIC_CA)}

## Frases de lectura en voz alta

### Inglés
${list(o.READING_SENTENCES.map((s: any) => `${s.text} _(sonidos: ${(s.targetSounds ?? []).join(", ")})_`))}

### Catalán
${list(o.READING_SENTENCES_CA.map((s: any) => `${s.text} _(sonidos: ${(s.targetSounds ?? []).join(", ")})_`))}`;
});

// ── Situaciones ─────────────────────────────────────────────────────────────
await tryDump("03-situaciones.md", async () => {
  const m = await imp("situationsData.ts");
  const body = m.SITUATIONS.map(
    (s: any) => `## ${s.title} (${s.level})

${s.blurb}

**Frases clave**

${list(s.phrases.map((p: any) => `${p.en} — _${p.es}_`))}

**Vocabulario**

${list(s.words.map((p: any) => `${p.en} — _${p.es}_`))}

**Diálogo modelo** (el otro personaje: ${s.dialogue.otherRole})

${s.dialogue.lines.map((l: any) => `- **${l.who === "you" ? "Tú" : s.dialogue.otherRole}:** ${l.en}`).join("\n")}

**Quiz**

${s.quiz.map((q: any) => `- ${q.q}\n  - ✔ ${q.right}\n  - ✗ ${q.wrong.join("\n  - ✗ ")}`).join("\n")}

**Roleplay** — el coach hace de _${s.roleplay.coachRole}_. ${s.roleplay.description}
Apertura: "${s.roleplay.opening}"`
  ).join("\n\n");
  return `# Situaciones (${m.SITUATIONS.length} misiones)\n\nPantalla: \`/situations\`. Archivo: \`src/lib/situationsData.ts\`. Cada misión tiene 4 pasos: frases y vocabulario → diálogo → quiz → roleplay con el coach. Al completarla da +50 XP.\n\n${body}`;
});

// ── Gramática ───────────────────────────────────────────────────────────────
await tryDump("04-gramatica.md", async () => {
  const m = await imp("grammarLessons.ts");
  const body = m.GRAMMAR_LESSONS.map(
    (l: any) => `## ${l.title} (${l.level})

${l.summary}

Ayuda a corregir los errores: ${l.errorTypes.join(", ")}.

${l.rules.map((r: any) => `### ${r.title}\n\n${r.body}\n\n${list(r.examples.map((e: any) => `${e.en} — _${e.es}_`))}`).join("\n\n")}

**Errores típicos**

${list(l.mistakes.map((x: any) => `✗ ${x.wrong} → ✔ ${x.right}. ${x.why}`))}

**Quiz**

${l.quiz.map((q: any) => `- ${q.q}\n  - ✔ ${q.right}\n  - ✗ ${q.wrong.join("\n  - ✗ ")}`).join("\n")}`
  ).join("\n\n");
  return `# Gramática (${m.GRAMMAR_LESSONS.length} lecciones)\n\nPantalla: \`/grammar\`. Archivo: \`src/lib/grammarLessons.ts\`. Lecciones cortas en español ligadas a los tipos de error que detecta el coach.\n\n${body}`;
});

// ── Sonidos y escucha ───────────────────────────────────────────────────────
await tryDump("05-sonidos-y-escucha.md", async () => {
  const s = await imp("soundsData.ts");
  const l = await imp("linkingData.ts");
  const cs = await imp("catalanSounds.ts");
  const cl = await imp("catalanListeningPatterns.ts");
  return `# Sonidos y escucha

## Sonidos del inglés (\`/sounds\`, ${s.SOUNDS.length})

${s.SOUNDS.map((x: any) => `### ${x.ipa} · ${x.name} (${x.nameEs})

${x.articulation}

Ejemplos: ${x.examples.join(", ")}.
Pares mínimos: ${x.minimalPairs.map((p: any) => `${p.a} / ${p.b}`).join(" · ")}.
Frase para repetir: "${x.shadowingPhrase}"`).join("\n\n")}

## Patrones de habla conectada del inglés (\`/listening\`, ${l.PATTERNS.length})

${Object.entries(l.TYPE_LABELS).map(([k, v]) => `- **${v}** — ${l.TYPE_DESCRIPTIONS[k]}`).join("\n")}

${l.PATTERNS.map((p: any) => `- [${p.type}] "${p.written}" suena "${p.spoken}". ${p.explanationEs}`).join("\n")}

## Sonidos catalanes (pausado, ${cs.catalanSounds.length})

${cs.catalanSounds.map((x: any) => `- ${JSON.stringify(x)}`).join("\n")}

## Patrones de escucha catalanes (pausado, ${cl.catalanListeningPatterns.length})

${cl.catalanListeningPatterns.map((x: any) => `- ${JSON.stringify(x)}`).join("\n")}`;
});

// ── Roleplay, temas y frases ────────────────────────────────────────────────
await tryDump("06-roleplay-temas-y-frases.md", async () => {
  const sc = await imp("scenarios.ts");
  const tp = await imp("topics.ts");
  const pp = await imp("pronunciationPhrases.ts");
  const ac = await imp("achievements.ts");
  const et = await imp("errorTypes.ts");
  const fmtSc = (a: any[]) => a.map((s) => `- **${s.title}** (${s.difficulty}) — ${s.description} El coach hace de _${String(s.coach_role).replace(/.$/, "")}_. Apertura: "${s.opening}"`).join("\n");
  const asArr = (v: any) => (Array.isArray(v) ? v : Object.values(v ?? {}));
  return `# Roleplay, temas de conversación y frases

## Escenas de roleplay (\`/roleplay\`)

### Inglés
${fmtSc(sc.SCENARIOS)}

### Catalán (pausado)
${fmtSc(sc.SCENARIOS_CA)}

## Temas de conversación

### Para elegir al empezar
Inglés: ${tp.PICKER_TOPICS.en.join(" · ")}
Catalán: ${tp.PICKER_TOPICS.ca.join(" · ")}
Chat libre: ${JSON.stringify(tp.FREE_CHAT)}

### Tema del día (práctica diaria)
Inglés:
${list(tp.DAILY_TOPICS.en)}

Catalán:
${list(tp.DAILY_TOPICS.ca)}

## Frases de pronunciación

${list(pp.PRONUNCIATION_PHRASES.map((p: any) => `[${p.level ?? ""}] ${p.text ?? p.phrase ?? JSON.stringify(p)}`))}

## Logros

${list(ac.ACHIEVEMENTS.map((a: any) => `**${a.title ?? a.name}** — ${a.description ?? a.desc ?? ""}`))}

## Tipos de error que detecta el coach

${list(Object.entries(et.ERROR_TYPES).map(([k, v]: any) => `\`${k}\` — ${v.label}. ${v.hint ?? ""}`))}`;
});

// ── Contenido catalán sembrado ──────────────────────────────────────────────
await tryDump("07-contenido-catalan-sembrado.md", async () => {
  const m: any = await import(/* @vite-ignore */ ROOT + "/scripts/seed/catalan-data.ts");
  return `# Contenido catalán sembrado (pausado)

Archivo: \`scripts/seed/catalan-data.ts\`. Se carga con \`npm run seed:catalan\` (necesita la service role key).

## Historias (${m.catalanStories.length})

${m.catalanStories.map((s: any) => `### ${s.title} (${s.level})\n\n${s.content}`).join("\n\n")}

## Expresiones (${m.catalanChunks.length})

${list(m.catalanChunks.map((c: any) => `${c.content} — _${c.english}_`))}

## Vocabulario (${m.catalanVocabulary.length})

${list(m.catalanVocabulary.map((v: any) => `**${v.word}** — ${v.definition}. «${v.example}»`))}`;
});
