import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { getVocabulary, type VocabWord, type WordStatus } from "../lib/vocabulary";
import { addToReview } from "../lib/srs";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import Maica from "../components/Maica";
import Loader from "../components/Loader";
import { tFor } from "../i18n";

type Filter = "all" | WordStatus;

const STATUS_ORDER: WordStatus[] = ["new", "learning", "known"];

const STATUS_KEY = {
  new: "words.statusNew",
  learning: "words.statusLearning",
  known: "words.statusKnown",
} as const;

/**
 * "Mis palabras": el cuaderno de vocabulario. Hasta ahora se podían guardar
 * palabras al leer, pero no había ningún lugar para verlas, escucharlas,
 * cambiarles el estado o borrarlas.
 */
export default function Words() {
  const { profile } = useAuth();
  const prefs = useVoicePrefs();
  const lang = profile?.learning_language || "en";
  const t = tFor(lang);

  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    getVocabulary(profile.id, lang)
      .then((w) => { if (!cancelled) setWords(w); })
      .catch(() => { if (!cancelled) setWords([]); });
    return () => { cancelled = true; };
  }, [profile?.id, lang]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, new: 0, learning: 0, known: 0 };
    for (const w of words ?? []) {
      c.all++;
      c[w.status]++;
    }
    return c;
  }, [words]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (words ?? []).filter(
      (w) =>
        (filter === "all" || w.status === filter) &&
        (!q || w.word.toLowerCase().includes(q) || (w.definition ?? "").toLowerCase().includes(q))
    );
  }, [words, filter, query]);

  const statusLabel = (s: WordStatus) => t(STATUS_KEY[s]);

  function play(word: string) {
    speak(word, { voiceName: prefs.voiceName ?? undefined, rate: prefs.voiceRate, lang: prefs.voiceAccent });
  }

  async function changeStatus(w: VocabWord, status: WordStatus) {
    if (!profile || w.status === status) return;
    setError("");
    const previous = words;
    setWords((list) => (list ?? []).map((x) => (x.id === w.id ? { ...x, status } : x)));
    const { error: err } = await supabase
      .from("user_vocabulary")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", w.id);
    if (err) {
      setWords(previous);
      setError(t("words.errUpdate"));
      return;
    }
    // Misma regla que al leer: una palabra "en aprendizaje" entra al repaso.
    if (status === "learning") {
      await addToReview(
        profile.id,
        { item_type: "word", content: w.word, prompt: w.definition || w.word, source_ref: w.word },
        lang
      );
    }
  }

  async function remove(w: VocabWord) {
    setError("");
    const { error: err } = await supabase.from("user_vocabulary").delete().eq("id", w.id);
    if (err) {
      setError(t("words.errDelete"));
      return;
    }
    setWords((list) => (list ?? []).filter((x) => x.id !== w.id));
    setConfirmId(null);
  }

  if (!profile || words === null) return <Loader />;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{t("words.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("words.title")}</h1>
      <p className="text-paper-muted mb-6">{t("words.intro")}</p>

      {counts.all === 0 ? (
        <div className="empty-state card">
          <Maica mood="curious" size="md" className="mb-1" />
          <p className="empty-state-title">{t("words.emptyTitle")}</p>
          <p className="empty-state-sub">{t("words.emptySub")}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <Link to="/stories" className="btn-coral text-sm px-4 py-2">{t("words.readStory")}</Link>
            <Link to="/reading" className="btn-ghost text-sm px-4 py-2">{t("words.openReading")}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("words.filterAria")}>
            {(["all", ...STATUS_ORDER] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === f ? "bg-coral text-ink-900" : "bg-ink-700 text-paper-muted hover:text-paper"
                }`}
              >
                {f === "all" ? t("words.all") : statusLabel(f)} · {counts[f]}
              </button>
            ))}
          </div>

          <div className="relative mb-5">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-faint" />
            <input
              className="input pl-10"
              placeholder={t("words.searchPlaceholder")}
              aria-label={t("words.searchAria")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && <p className="mb-3 text-sm text-coral" role="alert">{error}</p>}

          {visible.length === 0 ? (
            <p className="py-10 text-center text-paper-muted">{t("words.noMatch")}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 stagger">
              {visible.map((w) => (
                <li key={w.id} className="card p-4">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold leading-tight break-words">{w.word}</p>
                      {w.phonetic && <p className="font-mono text-xs text-paper-muted">{w.phonetic}</p>}
                    </div>
                    <button
                      onClick={() => play(w.word)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-600 text-coral transition hover:bg-ink-500"
                      aria-label={t("words.listenWord", { w: w.word })}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>

                  {w.definition && <p className="text-sm text-paper-muted">{w.definition}</p>}
                  {w.example && <p className="mt-1 text-xs italic text-paper-faint">"{w.example}"</p>}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-xl bg-ink-800 p-0.5" role="group" aria-label={t("words.statusAria")}>
                      {STATUS_ORDER.map((s) => (
                        <button
                          key={s}
                          onClick={() => changeStatus(w, s)}
                          aria-pressed={w.status === s}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            w.status === s
                              ? s === "known"
                                ? "bg-mint/25 text-mint"
                                : s === "learning"
                                ? "bg-gold/25 text-gold"
                                : "bg-ink-500 text-paper"
                              : "text-paper-faint hover:text-paper"
                          }`}
                        >
                          {statusLabel(s)}
                        </button>
                      ))}
                    </div>

                    {confirmId === w.id ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-paper-muted">{t("words.deleteQ")}</span>
                        <button onClick={() => remove(w)} className="rounded-lg bg-coral/20 px-2 py-1 font-medium text-coral hover:bg-coral/30">
                          {t("words.yes")}
                        </button>
                        <button onClick={() => setConfirmId(null)} className="rounded-lg bg-ink-600 px-2 py-1 text-paper-muted hover:bg-ink-500">
                          {t("words.no")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(w.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-paper-faint transition hover:bg-ink-600 hover:text-coral"
                        aria-label={t("words.deleteWord", { w: w.word })}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
