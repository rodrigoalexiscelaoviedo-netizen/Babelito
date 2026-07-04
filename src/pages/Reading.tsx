import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Volume2, Pause, Play } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { READING_TEXTS, type ReadingText } from "../lib/readingTexts";
import type { WordDefinition } from "../lib/dictionary";
import type { VocabMap, WordStatus } from "../lib/vocabulary";
import { speak, pauseSpeech, resumeSpeech } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import ClickableText from "../components/ClickableText";
import ShadowingBlock from "../components/ShadowingBlock";
import Loader from "../components/Loader";

const LEVEL_BADGE: Record<string, string> = {
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-[#F4C431]",
  B2: "bg-coral/20 text-coral",
};

/** Returns the first complete sentence (ending in . ! ?) from a text. */
function firstSentence(text: string): string {
  const match = text.match(/[^.!?]*[.!?]/);
  return match ? match[0].trim() : text.split(" ").slice(0, 12).join(" ");
}

export default function Reading() {
  const [view, setView] = useState<"library" | "reader">("library");
  const [activeText, setActiveText] = useState<ReadingText | null>(null);
  const [customContent, setCustomContent] = useState("");

  function openText(text: ReadingText) {
    setActiveText(text);
    setView("reader");
  }

  function openCustom() {
    if (!customContent.trim()) return;
    setActiveText({
      id: "custom",
      title: "My text",
      author: "Pasted text",
      level: "B1",
      content: customContent.trim(),
    });
    setView("reader");
  }

  if (view === "reader" && activeText) {
    return <Reader text={activeText} onBack={() => setView("library")} />;
  }

  return (
    <div className="animate-fade-up">
      <p className="eyebrow mb-2">Reading</p>
      <h1 className="font-display text-3xl font-extrabold mb-2">Read & build vocabulary</h1>
      <p className="text-paper-muted mb-8">
        Click any word to look it up and track it. Coloured words are in your vocabulary list.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {READING_TEXTS.map((t) => (
          <button
            key={t.id}
            onClick={() => openText(t)}
            className="card p-5 text-left hover:border-coral/50 transition"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <BookOpen size={18} className="text-coral mt-0.5 shrink-0" />
              <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${LEVEL_BADGE[t.level] ?? ""}`}>
                {t.level}
              </span>
            </div>
            <h3 className="font-display font-bold text-base leading-snug">{t.title}</h3>
            <p className="text-xs text-paper-muted mt-0.5">{t.author}</p>
            <p className="text-xs text-paper-faint mt-2 line-clamp-2">{t.content.slice(0, 100)}…</p>
          </button>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display font-bold mb-3">Paste your own text</h3>
        <textarea
          className="input min-h-[120px] resize-none w-full mb-3"
          placeholder="Paste any English text here…"
          value={customContent}
          onChange={(e) => setCustomContent(e.target.value)}
        />
        <button
          className="btn-coral w-full"
          onClick={openCustom}
          disabled={!customContent.trim()}
        >
          Read this text →
        </button>
      </div>
    </div>
  );
}

function Reader({ text, onBack }: { text: ReadingText; onBack: () => void }) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [vocabMap, setVocabMap] = useState<VocabMap>({});
  const [loadingVocab, setLoadingVocab] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("user_vocabulary")
        .select("*")
        .eq("user_id", profile.id);
      if (data) {
        const map: VocabMap = {};
        for (const row of data as Array<{ word: string; status: WordStatus; definition?: string; example?: string; phonetic?: string }>) {
          map[row.word] = { status: row.status, definition: row.definition ?? undefined, example: row.example ?? undefined, phonetic: row.phonetic ?? undefined };
        }
        setVocabMap(map);
      }
      setLoadingVocab(false);
    })();
  }, [profile]);

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

  function handleVocabUpdate(word: string, status: WordStatus, def: WordDefinition) {
    setVocabMap((prev) => ({
      ...prev,
      [word]: { status, definition: def.definition_es, example: def.example, phonetic: def.phonetic },
    }));
  }

  if (loadingVocab) return <Loader />;

  const shadowSentence = firstSentence(text.content);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="text-paper-muted hover:text-paper transition">
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
              aria-label={paused ? "Resume narration" : "Pause narration"}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
          <button
            onClick={handleFullNarration}
            className="flex items-center gap-1 text-xs text-paper-faint hover:text-coral transition"
            aria-label="Listen to full text"
          >
            <Volume2 size={15} /> Listen
          </button>
        </div>
      </div>

      {/* Scroll progress */}
      <div className="h-1 w-full bg-ink-600 rounded-full mb-4">
        <div className="h-1 bg-coral rounded-full transition-all" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Scrollable text area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-4">
        <ClickableText
          text={text.content}
          vocabMap={vocabMap}
          userId={profile!.id}
          voicePrefs={voicePrefs}
          source="reading"
          onVocabUpdate={handleVocabUpdate}
        />

        {/* Shadowing block — first sentence as practice phrase */}
        <div className="mt-6 pb-4">
          <ShadowingBlock
            text={shadowSentence}
            lang={voicePrefs.voiceAccent ?? "en-GB"}
            label="Shadowing practice"
          />
        </div>
      </div>
    </div>
  );
}
