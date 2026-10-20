/**
 * Exporta tarjetas a un archivo de texto que Anki importa directamente
 * (File → Import). Formato: separador TAB, con directivas de cabecera que Anki
 * entiende (#separator, #html, #notetype, #deck, #tags column). Ver
 * https://docs.ankiweb.net/importing/text-files.html
 */

export interface AnkiCard {
  /** Lo que el alumno debe decir o recordar (cara frontal). */
  front: string;
  /** Traducción, pista o explicación (cara trasera). */
  back: string;
  /** Etiquetas separadas por espacio, p. ej. "babelito ca chunk". */
  tags?: string;
}

/** Escapa un campo para la importación por tabulador: sin tabs ni saltos de línea. */
export function escapeField(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, "<br>").trim();
}

export function buildAnkiText(
  cards: AnkiCard[],
  options: { deck: string; notetype?: string } = { deck: "Babelito" }
): string {
  const header = [
    "#separator:tab",
    "#html:true",
    `#notetype:${options.notetype ?? "Basic (and reversed card)"}`,
    `#deck:${options.deck}`,
    "#tags column:3",
  ];
  const rows = cards
    .filter((c) => c.front.trim() && c.back.trim())
    .map((c) => [escapeField(c.front), escapeField(c.back), (c.tags ?? "babelito").trim()].join("\t"));
  return [...header, ...rows].join("\n") + "\n";
}

/** Nombre de archivo seguro para descargar. */
export function ankiFileName(language: string, date: string): string {
  return `babelito-${language}-${date}.txt`;
}

/** Descarga el texto como archivo UTF-8 con BOM (Anki lee bien los acentos así). */
export function downloadAnki(text: string, fileName: string): void {
  const blob = new Blob(["﻿", text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
