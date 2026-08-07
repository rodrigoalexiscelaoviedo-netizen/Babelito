/**
 * The `language` column was added by hand to several tables after they already
 * had rows (English content/history predates the Catalan rollout). Those old
 * rows may have `language = null` instead of 'en'. Treat null as English so
 * pre-existing data doesn't disappear from English learners' view.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scopeByLanguage(query: any, language: string): any {
  return language === "en" ? query.or("language.eq.en,language.is.null") : query.eq("language", language);
}
