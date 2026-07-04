import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Volume2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { READING_TEXTS, type ReadingText } from "../lib/readingTexts";
import { lookupWord, type WordDefinition } from "../lib/dictionary";
import { upsertWord, type WordStatus } from "../lib/vocabulary";
import { speak } from "../lib/speech";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import Loader from "../components/Loader";

type VocabMap = Record<string, { status: WordStatus; definition?: string; example?: string; phonetic?: string }>;

const LEVEL_BADGE: Record<string, string> = {
  A2: "bg-mint/20 text-mint",
  B1: "bg-gold/20 text-[#F4C431]",
  B2: "bg-coral/20 text-coral",
};

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

// ─── Reader ───────────────────────────────────────────────────────────────────

function Reader({ text, onBack }: { text: ReadingText; onBack: () => void }) {
  const { profile } = useAuth();
  const voicePrefs = useVoicePrefs();
  const [vocabMap, setVocabMap] = useState<VocabMap>({});
  const [loadingVocab, setLoadingVocab] = useState(true);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const defCache = useRef<Map<string, WordDefinition>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Load user vocabulary
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("user_vocabulary")
        .select("word, status, definition, example, phonetic")
        .eq("user_id", profile.id);
      if (data) {
        const map: VocabMap = {};
        for (const row of data as Array<{word:string;status:WordStatus;definition?:string;example?:string;phonetic?:string}>) {
          map[row.word] = { status: row.status, definition: row.definition ?? undefined, example: row.example ?? undefined, phonetic: row.phonetic ?? undefined };
        }
        setVocabMap(map);
      }
      setLoadingVocab(false);
    })();
  }, [profile]);

  // Scroll progress
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

  async function handleWordClick(raw: string) {
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    if (!word) return;
    setSelectedWord(word);
    setWordDef(null);

    if (defCache.current.has(word)) {
      setWordDef(defCache.current.get(word)!);
      return;
    }
    setLoadingDef(true);
    const def = await lookupWord(word);
    defCache.current.set(word, def);
    setWordDef(def);
    setLoadingDef(false);
  }

  async function markStatus(status: WordStatus) {
    if (!selectedWord || !profile || !wordDef) return;
    await upsertWord(profile.id, selectedWord, {
      status,
      definition: wordDef.definition_es,
      example: wordDef.example,
      phonetic: wordDef.phonetic,
      source: "reading",
    });
    setVocabMap((prev) => ({
      ...prev,
      [selectedWord]: {
        status,
        definition: wordDef.definition_es,
        example: wordDef.example,
        phonetic: wordDef.phonetic,
      },
    }));
  }

  function wordClass(raw: string): string {
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    const entry = vocabMap[word];
    if (!entry || entry.status === "new") return "text-coral/80 cursor-pointer hover:text-coral transition";
    if (entry.status === "learning") return "text-[#F4C431]/80 cursor-pointer hover:text-[#F4C431] transition";
    return "cursor-pointer hover:text-paper-muted transition"; // known
  }

  if (loadingVocab) return <Loader />;

  const tokens = tokenize(text.content);

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
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-ink-600 rounded-full mb-4">
        <div
          className="h-1 bg-coral rounded-full transition-all"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Text area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto leading-8 text-paper text-base"
        onClick={() => selectedWord && setSelectedWord(null)}
      >
        {tokens.map((token, i) => {
          if (!isWord(token)) return <span key={i}>{token}</span>;
          return (
            <span
              key={i}
              className={wordClass(token)}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(token);
              }}
            >
              {token}
            </span>
          );
        })}
      </div>

      {/* Word panel */}
      {selectedWord && (
        <div className="card mt-3 p-4 relative">
          <button
            onClick={() => setSelectedWord(null)}
            className="absolute top-3 right-3 text-paper-faint hover:text-paper"
          >
            <X size={15} />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-lg">{selectedWord}</p>
              {wordDef?.phonetic && (
                <p className="font-mono text-sm text-paper-muted">{wordDef.phonetic}</p>
              )}
            </div>
            <button
              onClick={() =>
                speak(selectedWord, {
                  voiceName: voicePrefs.voiceName ?? undefined,
                  rate: voicePrefs.voiceRate,
                  lang: voicePrefs.voiceAccent,
                })
              }
              className="text-paper-faint hover:text-coral transition mt-1"
              aria-label="Pronounce"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {loadingDef && <p className="text-paper-muted text-sm">Looking up…</p>}
          {wordDef && !loadingDef && (
            <div className="space-y-1 mb-4">
              <p className="text-sm">
                <span className="text-paper-muted">ES: </span>
                {wordDef.definition_es}
              </p>
              <p className="text-sm">
                <span className="text-paper-muted">EN: </span>
                {wordDef.definition_en}
              </p>
              {wordDef.example && (
                <p className="text-xs text-paper-faint italic mt-1">"{wordDef.example}"</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <StatusBtn
              label="New"
              active={vocabMap[selectedWord]?.status === "new"}
              color="bg-coral/20 text-coral hover:bg-coral/30"
              onClick={() => markStatus("new")}
              disabled={loadingDef || !wordDef}
            />
            <StatusBtn
              label="Learning"
              active={vocabMap[selectedWord]?.status === "learning"}
              color="bg-[#F4C431]/20 text-[#F4C431] hover:bg-[#F4C431]/30"
              onClick={() => markStatus("learning")}
              disabled={loadingDef || !wordDef}
            />
            <StatusBtn
              label="I know it"
              active={vocabMap[selectedWord]?.status === "known"}
              color="bg-mint/20 text-mint hover:bg-mint/30"
              onClick={() => markStatus("known")}
              disabled={loadingDef || !wordDef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBtn({
  label,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${color} ${active ? "ring-2 ring-white/20" : ""} disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function isWord(token: string): boolean {
  return /[a-zA-Z]/.test(token);
}
