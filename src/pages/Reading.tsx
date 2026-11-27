import { useHistoryBack } from "../lib/useHistoryBack";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Volume2, Pause, Play } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { READING_TEXTS, READING_TEXTS_CA, type ReadingText } from "../lib/readingTexts";
import type { WordDefinition } from "../lib/dictionary";
import type { VocabMap, WordStatus } from "../lib/vocabulary";
import { scopeByLanguage } from "../lib/language";
import { speak, pauseSpeech, resumeSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ClickableText from "../components/ClickableText";
import ShadowingBlock from "../components/ShadowingBlock";
import ReadingFinish, { type SavedWord } from "../components/ReadingFinish";
import Loader from "../components/Loader";
import { tFor } from "../i18n";

const LEVEL_BADGE: Record<string, string> = {
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-gold",
  B2: "bg-coral/20 text-coral",
};

/** Minutos de lectura a ~120 palabras por minuto (ritmo de quien aprende), mínimo 1. */
function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 120));
}

/** Returns the first complete sentence (ending in . ! ?) from a text. */
function firstSentence(text: string): string {
  const match = text.match(/[^.!?]*[.!?]/);
  return match ? match[0].trim() : text.split(" ").slice(0, 12).join(" ");
}

export default function Reading() {
  const { profile } = useAuth();
  const learningLanguage = profile?.learning_language || "en";
  const t = tFor(learningLanguage);
  const [view, setView] = useState<"library" | "reader">("library");
  const [activeText, setActiveText] = useState<ReadingText | null>(null);
  useHistoryBack(view === "reader", () => setView("library"));
  const [customContent, setCustomContent] = useState("");

  function openText(text: ReadingText) {
    setActiveText(text);
    setView("reader");
  }

  function openCustom() {
    if (!customContent.trim()) return;
    setActiveText({
      id: "custom",
      title: t("reading.customTitle"),
      author: t("reading.customAuthor"),
      level: "B1",
      content: customContent.trim(),
    });
    setView("reader");
  }

  if (view === "reader" && activeText) {
    return <Reader text={activeText} onBack={() => setView("library")} />;
  }

  const texts = learningLanguage === "ca" ? READING_TEXTS_CA : READING_TEXTS;

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">{t("reading.eyebrow")}</p>
      <h1 className="page-title mb-2">{t("reading.title")}</h1>
      <p className="text-paper-muted mb-8">{t("reading.intro")}</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8 stagger">
        {texts.map((txt) => (
          <button
            key={txt.id}
            onClick={() => openText(txt)}
            className="card-interactive p-5 text-left"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <BookOpen size={18} className="text-coral mt-0.5 shrink-0" />
              <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${LEVEL_BADGE[txt.level] ?? ""}`}>
                {txt.level}
              </span>
            </div>
            <h3 className="font-display font-bold text-base leading-snug">{txt.title}</h3>
            <p className="text-xs text-paper-muted mt-0.5">{txt.author}</p>
            <p className="text-xs text-paper-faint mt-2 line-clamp-2">{txt.content.slice(0, 100)}…</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-paper-faint">
              ~{readingMinutes(txt.content)} min · {t("reading.tapWords")} · {t("reading.quickCheck")}
            </p>
          </button>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display font-bold mb-3">{t("reading.pasteTitle")}</h3>
        <textarea
          aria-label={t("reading.pasteAria")}
          className="input min-h-[120px] resize-none w-full mb-3"
          placeholder={t("reading.pastePlaceholder")}
          value={customContent}
          onChange={(e) => setCustomContent(e.target.value)}
        />
        <button
          className="btn-coral w-full"
          onClick={openCustom}
          disabled={!customContent.trim()}
        >
          {t("reading.readThis")}
        </button>
      </div>
    </div>
  );
}

function Reader({ text, onBack }: { text: ReadingText; onBack: () => void }) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const learningLanguage = profile?.learning_language || "en";
  const t = tFor(learningLanguage);
  const [vocabMap, setVocabMap] = useState<VocabMap>({});
  const [loadingVocab, setLoadingVocab] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      // El vocabulario se guarda por idioma: lo que marca quien aprende catalán no mezcla con el inglés.
      const { data } = await scopeByLanguage(
        supabase.from("user_vocabulary").select("*").eq("user_id", profile.id),
        learningLanguage
      );
      if (data) {
        const map: VocabMap = {};
        for (const row of data as Array<{ word: string; status: WordStatus; definition?: string; example?: string; phonetic?: string }>) {
          map[row.word] = { status: row.status, definition: row.definition ?? undefined, example: row.example ?? undefined, phonetic: row.phonetic ?? undefined };
        }
        setVocabMap(map);
      }
      setLoadingVocab(false);
    })();
  }, [profile, learningLanguage]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const max = scrollHeight - clientHeight;
      setScrollProgress(max > 0 ? Math.round((scrollTop / max) * 100) : 100);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function handleFullNarration() {
    speak(text.content, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent,
    });
    setSpeaking(true);
    setPaused(false);
  }

  function handlePauseResume() {
    if (paused) {
      resumeSpeech();
      setPaused(false);
    } else {
      pauseSpeech();
      setPaused(true);
    }
  }

  function handleVocabUpdate(word: string, status: WordStatus, def: WordDefinition | null) {
    setVocabMap((prev) => ({
      ...prev,
      [word]: { status, definition: def?.definition_es, example: def?.example, phonetic: def?.phonetic },
    }));
    // Las palabras que la persona decide practicar en esta lectura se repasan al cerrarla.
    setSavedWords((prev) => {
      const rest = prev.filter((w) => w.word !== word);
      return status === "learning" ? [...rest, { word, translation: def?.translation || def?.definition_es || "" }] : rest;
    });
  }

  if (loadingVocab) return <Loader />;

  const shadowSentence = firstSentence(text.content);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} aria-label={t("common.back")} className="text-paper-muted hover:text-paper transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{text.title}</p>
          <p className="text-xs text-paper-muted">{text.author}</p>
        </div>
        {/* Full narration controls */}
        <div className="flex items-center gap-1 shrink-0">
          {speaking && (
            <button
              onClick={handlePauseResume}
              className="text-paper-faint hover:text-mint transition"
              aria-label={paused ? t("reading.resumeNarr") : t("reading.pauseNarr")}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
          <button
            onClick={handleFullNarration}
            className="flex items-center gap-1 text-xs text-paper-faint hover:text-coral transition"
            aria-label={t("reading.listenFull")}
          >
            <Volume2 size={15} /> {t("reading.listen")}
          </button>
        </div>
      </div>

      {/* Scroll progress */}
      <div
        role="progressbar"
        aria-label={t("reading.progressAria")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={scrollProgress}
        className="h-1 w-full bg-ink-600 rounded-full mb-4"
      >
        <div className="h-1 bg-coral rounded-full transition-[width] duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Scrollable text area */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label={t("reading.textAria")}
        className="flex-1 overflow-y-auto space-y-4 focus-visible:outline-2 focus-visible:outline-coral rounded-sm"
      >
        <ClickableText
          text={text.content}
          vocabMap={vocabMap}
          userId={profile!.id}
          language={learningLanguage}
          voicePrefs={voicePrefs}
          source="reading"
          onVocabUpdate={handleVocabUpdate}
        />

        {/* Cierre: comprensión + palabras guardadas + qué sigue */}
        <div className="mt-8">
          <ReadingFinish text={text} saved={savedWords} userId={profile!.id} voicePrefs={voicePrefs} onNext={onBack} lang={learningLanguage === "ca" ? "ca" : "en"} />
        </div>

        {/* Bonus: decir la primera frase en voz alta */}
        <div className="mt-6 pb-4">
          <p className="eyebrow mb-2">{t("reading.bonus")}</p>
          <ShadowingBlock
            text={shadowSentence}
            lang={voicePrefs.voiceAccent ?? (learningLanguage === "ca" ? "ca-ES" : "en-GB")}
            label={t("reading.shadowLabel")}
          />
        </div>
      </div>
    </div>
  );
}
