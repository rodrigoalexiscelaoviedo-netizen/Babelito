import { useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { lookupWord, type WordDefinition } from "../lib/dictionary";
import { upsertWord, type VocabMap, type WordStatus } from "../lib/vocabulary";
import { speak } from "../lib/speech";
import type { VoicePrefs } from "../lib/useVoicePrefs";
import { addToReview } from "../lib/srs";

interface ClickableTextProps {
  text: string;
  vocabMap: VocabMap;
  userId: string;
  voicePrefs: VoicePrefs;
  source: string;
  /** In Stories mode: adds gold underline to 'learning' words as "words in practice" */
  highlightLearning?: boolean;
  onVocabUpdate: (word: string, status: WordStatus, def: WordDefinition) => void;
}

export default function ClickableText({
  text,
  vocabMap,
  userId,
  voicePrefs,
  source,
  highlightLearning = false,
  onVocabUpdate,
}: ClickableTextProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);
  const defCache = useRef<Map<string, WordDefinition>>(new Map());

  const tokens = tokenize(text);

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
    if (!selectedWord || !wordDef) return;
    await upsertWord(userId, selectedWord, {
      status,
      definition: wordDef.definition_es,
      example: wordDef.example,
      phonetic: wordDef.phonetic,
      source,
    });
    if (status === "learning") {
      // Auto-add to oral review deck; silently ignores duplicates
      await addToReview(userId, {
        item_type: "word",
        content: selectedWord,
        prompt: wordDef.definition_es || selectedWord,
        source_ref: selectedWord,
      });
    }
    onVocabUpdate(selectedWord, status, wordDef);
  }

  function wordClass(raw: string): string {
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    const entry = vocabMap[word];
    const status = entry?.status;

    let base = "cursor-pointer transition ";
    if (!entry || status === "new") {
      base += "text-coral/80 hover:text-coral";
    } else if (status === "learning") {
      base += "text-[#F4C431]/80 hover:text-[#F4C431]";
      if (highlightLearning) {
        base += " underline decoration-[#F4C431]/50 underline-offset-2 decoration-wavy";
      }
    } else {
      // known
      base += "hover:text-paper-muted";
    }
    return base;
  }

  function isLearningWord(raw: string): boolean {
    if (!highlightLearning) return false;
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    return vocabMap[word]?.status === "learning";
  }

  return (
    <div className="relative" onClick={() => selectedWord && setSelectedWord(null)}>
      {/* Text */}
      <div className="leading-8 text-paper text-base">
        {tokens.map((token, i) => {
          if (!isWordToken(token)) return <span key={i}>{token}</span>;
          const isLearning = isLearningWord(token);
          return (
            <span
              key={i}
              className={wordClass(token)}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(token);
              }}
              title={isLearning ? "One of your learning words" : undefined}
            >
              {token}
            </span>
          );
        })}
      </div>

      {/* Word panel */}
      {selectedWord && (
        <div
          className="card mt-3 p-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
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
              color="bg-gold/20 text-gold hover:bg-gold/30"
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
      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${color} ${
        active ? "ring-2 ring-white/20" : ""
      } disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function isWordToken(token: string): boolean {
  return /[a-zA-Z]/.test(token);
}
