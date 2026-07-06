import { useMemo, useRef, useState } from "react";
import { Volume2, X, Layers } from "lucide-react";
import { lookupWord, lookupPhrase, type WordDefinition, type PhraseExplanation } from "../lib/dictionary";
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

type Mode = "word" | "sentence";

export default function ClickableText({
  text,
  vocabMap,
  userId,
  voicePrefs,
  source,
  highlightLearning = false,
  onVocabUpdate,
}: ClickableTextProps) {
  const [mode, setMode] = useState<Mode>("word");

  // Word mode state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDef, setWordDef] = useState<WordDefinition | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);
  const defCache = useRef<Map<string, WordDefinition>>(new Map());

  // Sentence mode state
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [phraseExpl, setPhraseExpl] = useState<PhraseExplanation | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [phraseInDeck, setPhraseInDeck] = useState(false);
  const phraseCache = useRef<Map<string, PhraseExplanation>>(new Map());

  const tokens = useMemo(() => tokenize(text), [text]);

  // Char start position of each token
  const tokenPositions = useMemo(() => {
    const positions: number[] = [];
    let pos = 0;
    for (const token of tokens) {
      positions.push(pos);
      pos += token.length;
    }
    return positions;
  }, [tokens]);

  // Range of selected sentence within full text
  const sentenceRange = useMemo(() => {
    if (!selectedSentence) return null;
    const idx = text.indexOf(selectedSentence);
    if (idx === -1) return null;
    return { start: idx, end: idx + selectedSentence.length };
  }, [selectedSentence, text]);

  // ── Word mode ──────────────────────────────────────────────────────────────

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
      await addToReview(userId, {
        item_type: "word",
        content: selectedWord,
        prompt: wordDef.definition_es || selectedWord,
        source_ref: selectedWord,
      });
    }
    onVocabUpdate(selectedWord, status, wordDef);
  }

  // ── Sentence mode ──────────────────────────────────────────────────────────

  function findSentenceAtChar(charIdx: number): string {
    const re = /[^.!?\n]+[.!?]*/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (charIdx >= match.index && charIdx < match.index + match[0].length) {
        return match[0].trim();
      }
    }
    return text.trim();
  }

  async function handleSentenceClick(tokenCharStart: number) {
    const sentence = findSentenceAtChar(tokenCharStart);
    if (!sentence || sentence === selectedSentence) return;
    setSelectedSentence(sentence);
    setPhraseExpl(null);
    setPhraseInDeck(false);

    if (phraseCache.current.has(sentence)) {
      setPhraseExpl(phraseCache.current.get(sentence)!);
      return;
    }
    setLoadingPhrase(true);
    const expl = await lookupPhrase(sentence);
    phraseCache.current.set(sentence, expl);
    setPhraseExpl(expl);
    setLoadingPhrase(false);
  }

  async function addPhraseToReview() {
    if (!selectedSentence || !phraseExpl) return;
    const result = await addToReview(userId, {
      item_type: "chunk",
      content: selectedSentence,
      prompt: phraseExpl.es || selectedSentence,
      source_ref: "",
    });
    if (result !== "error") setPhraseInDeck(true);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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
      base += "hover:text-paper-muted";
    }
    return base;
  }

  function isLearningWord(raw: string): boolean {
    if (!highlightLearning) return false;
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    return vocabMap[word]?.status === "learning";
  }

  function clearAll() {
    setSelectedWord(null);
    setSelectedSentence(null);
  }

  return (
    <div className="relative">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => { setMode("word"); clearAll(); }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            mode === "word"
              ? "bg-coral/20 text-coral"
              : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          Word mode
        </button>
        <button
          onClick={() => { setMode("sentence"); clearAll(); }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            mode === "sentence"
              ? "bg-mint/20 text-mint"
              : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          Select phrase
        </button>
        <span className="text-[10px] text-paper-faint">
          {mode === "word" ? "Tap a word to look it up" : "Tap any word to select its sentence"}
        </span>
      </div>

      {/* Text */}
      <div
        className="leading-8 text-paper text-base"
        onClick={() => clearAll()}
      >
        {tokens.map((token, i) => {
          if (!isWordToken(token)) return <span key={i}>{token}</span>;

          if (mode === "sentence") {
            const charStart = tokenPositions[i];
            const inSelected = sentenceRange
              ? charStart >= sentenceRange.start && charStart < sentenceRange.end
              : false;
            return (
              <span
                key={i}
                className={`cursor-pointer transition rounded-sm ${
                  inSelected
                    ? "bg-mint/25 text-mint"
                    : "hover:bg-ink-600"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSentenceClick(tokenPositions[i]);
                }}
              >
                {token}
              </span>
            );
          }

          // Word mode
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
      {mode === "word" && selectedWord && (
        <div className="card mt-3 p-4 relative" onClick={(e) => e.stopPropagation()}>
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

      {/* Sentence / phrase panel */}
      {mode === "sentence" && selectedSentence && (
        <div className="card mt-3 p-4 relative border-mint/30" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedSentence(null)}
            className="absolute top-3 right-3 text-paper-faint hover:text-paper"
          >
            <X size={15} />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-mint font-mono uppercase tracking-widest mb-1">Phrase</p>
              <p className="font-medium leading-snug">{selectedSentence}</p>
            </div>
            <button
              onClick={() =>
                speak(selectedSentence, {
                  voiceName: voicePrefs.voiceName ?? undefined,
                  rate: voicePrefs.voiceRate,
                  lang: voicePrefs.voiceAccent,
                })
              }
              className="text-paper-faint hover:text-coral transition mt-1 shrink-0"
              aria-label="Read aloud"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {loadingPhrase && <p className="text-paper-muted text-sm">Explaining…</p>}
          {phraseExpl && !loadingPhrase && (
            <div className="space-y-1.5 mb-4">
              <p className="text-sm">
                <span className="text-paper-muted">ES: </span>
                {phraseExpl.es}
              </p>
              {phraseExpl.grammar && (
                <p className="text-xs text-paper-faint">
                  <span className="text-paper-muted">Nota: </span>
                  {phraseExpl.grammar}
                </p>
              )}
            </div>
          )}

          <button
            onClick={addPhraseToReview}
            disabled={loadingPhrase || !phraseExpl || phraseInDeck}
            className={`flex items-center gap-2 w-full justify-center py-2 rounded-lg text-sm font-medium transition ${
              phraseInDeck
                ? "bg-gold/20 text-gold cursor-default"
                : "bg-ink-600 hover:bg-ink-500 text-paper disabled:opacity-40"
            }`}
          >
            <Layers size={14} />
            {phraseInDeck ? "Added to deck ✓" : "Add to review deck"}
          </button>
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
