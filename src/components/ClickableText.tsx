import { useMemo, useRef, useState } from "react";
import { Volume2, X, Plus, Check, Mic } from "lucide-react";
import { lookupWord, lookupPhrase, dictLang, type WordDefinition, type PhraseExplanation } from "../lib/dictionary";
import { upsertWord, type VocabMap, type WordStatus } from "../lib/vocabulary";
import { speak } from "../lib/speech";
import type { VoicePrefs } from "../lib/useVoicePrefs";
import { addToReview } from "../lib/srs";
import ShadowingBlock from "./ShadowingBlock";

interface ClickableTextProps {
  text: string;
  vocabMap: VocabMap;
  userId: string;
  language: string;
  voicePrefs: VoicePrefs;
  source: string;
  /** In Stories mode: adds gold underline to 'learning' words as "words in practice" */
  highlightLearning?: boolean;
  // def puede ser null: la palabra se puede guardar aunque el diccionario falle.
  onVocabUpdate: (word: string, status: WordStatus, def: WordDefinition | null) => void;
}

type Mode = "word" | "sentence";

export default function ClickableText({
  text,
  vocabMap,
  userId,
  language,
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
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const defCache = useRef<Map<string, WordDefinition>>(new Map());

  // Sentence mode state
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [phraseExpl, setPhraseExpl] = useState<PhraseExplanation | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [phraseInDeck, setPhraseInDeck] = useState(false);
  const [sayIt, setSayIt] = useState(false);
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

  const say = (t: string) =>
    speak(t, {
      voiceName: voicePrefs.voiceName ?? undefined,
      rate: voicePrefs.voiceRate,
      lang: voicePrefs.voiceAccent,
    });

  // ── Word mode ──────────────────────────────────────────────────────────────

  async function handleWordClick(raw: string) {
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    if (!word) return;
    setSelectedWord(word);
    setWordDef(null);
    setSaveError("");
    say(word);

    if (defCache.current.has(word)) {
      setWordDef(defCache.current.get(word)!);
      return;
    }
    setLoadingDef(true);
    const def = await lookupWord(word, dictLang(language));
    defCache.current.set(word, def);
    setWordDef(def);
    setLoadingDef(false);
  }

  async function markStatus(status: WordStatus) {
    // La palabra se guarda aunque el diccionario falle (sin traducción) y cualquier error se muestra.
    if (!selectedWord || saving) return;
    setSaveError("");
    setSaving(true);
    const translation = wordDef?.translation || undefined;
    try {
      await upsertWord(
        userId,
        selectedWord,
        {
          status,
          definition: translation,
          example: wordDef?.example,
          phonetic: wordDef?.phonetic,
          source,
        },
        language
      );
      if (status === "learning") {
        await addToReview(
          userId,
          {
            item_type: "word",
            content: selectedWord,
            prompt: translation || selectedWord,
            source_ref: selectedWord,
          },
          language
        );
      }
      onVocabUpdate(selectedWord, status, wordDef);
    } catch (e) {
      setSaveError(e instanceof Error ? `No se pudo guardar: ${e.message}` : "No se pudo guardar la palabra.");
    } finally {
      setSaving(false);
    }
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
    setSayIt(false);
    say(sentence);

    if (phraseCache.current.has(sentence)) {
      setPhraseExpl(phraseCache.current.get(sentence)!);
      return;
    }
    setLoadingPhrase(true);
    const expl = await lookupPhrase(sentence, dictLang(language));
    phraseCache.current.set(sentence, expl);
    setPhraseExpl(expl);
    setLoadingPhrase(false);
  }

  async function addPhraseToReview() {
    if (!selectedSentence || !phraseExpl) return;
    const result = await addToReview(
      userId,
      {
        item_type: "chunk",
        content: selectedSentence,
        prompt: phraseExpl.es || selectedSentence,
        source_ref: "",
      },
      language
    );
    if (result !== "error") setPhraseInDeck(true);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function wordClass(raw: string): string {
    const word = raw.toLowerCase().replace(/[^a-z']/g, "");
    const entry = vocabMap[word];
    const status = entry?.status;
    let base = "cursor-pointer transition ";
    if (!entry || status === "new") {
      // Texto normal: solo se marca al pasar el cursor (antes todo el texto quedaba rojo).
      base += "hover:text-coral hover:underline decoration-coral/50 decoration-dotted underline-offset-4";
    } else if (status === "learning") {
      base += "text-gold/80 hover:text-gold";
      if (highlightLearning) {
        base += " underline decoration-gold/50 underline-offset-2 decoration-wavy";
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

  const ca = language === "ca";
  const selectedStatus = selectedWord ? vocabMap[selectedWord]?.status : undefined;

  return (
    <div className="relative">
      {/* Mode toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={() => { setMode("word"); clearAll(); }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            mode === "word"
              ? "bg-coral/20 text-coral"
              : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          {ca ? "Paraules" : "Words"}
        </button>
        <button
          onClick={() => { setMode("sentence"); clearAll(); }}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            mode === "sentence"
              ? "bg-mint/20 text-mint"
              : "bg-ink-600 text-paper-muted hover:text-paper"
          }`}
        >
          {ca ? "Frases" : "Sentences"}
        </button>
        <span className="text-[11px] text-paper-faint">
          {mode === "word"
            ? ca ? "Toca una paraula: la sentiràs i veuràs què vol dir" : "Tap a word: you'll hear it and see what it means"
            : ca ? "Toca una frase per escoltar-la i practicar-la" : "Tap a sentence to hear it, understand it and say it"}
        </span>
      </div>

      {/* Text */}
      <div
        className="leading-8 text-paper text-base whitespace-pre-line"
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

      {/* Word card */}
      {mode === "word" && selectedWord && (
        <div className="card animate-fade-up mt-3 p-4 sticky bottom-2 z-10 shadow-[var(--pop-shadow)]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedWord(null)}
            aria-label="Close"
            className="absolute top-3 right-3 text-paper-faint hover:text-paper"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2 pr-6">
            <p className="font-display font-bold text-lg">{selectedWord}</p>
            {wordDef?.phonetic && <p className="font-mono text-xs text-paper-muted">{wordDef.phonetic}</p>}
            <button
              onClick={() => say(selectedWord)}
              className="ml-auto text-paper-faint hover:text-coral transition"
              aria-label="Pronounce"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {loadingDef && (
            <div className="mt-3 space-y-2 animate-pulse" aria-label="Looking up">
              <div className="h-6 w-2/5 rounded bg-ink-600" />
              <div className="h-3 w-4/5 rounded bg-ink-600" />
            </div>
          )}

          {!loadingDef && !wordDef?.translation && (
            <p className="mt-2 text-paper-faint text-xs">
              {ca ? "No hem trobat la traducció, però pots desar la paraula igualment." : "No encontramos la traducción, pero puedes guardar la palabra igual."}
            </p>
          )}

          {wordDef?.translation && !loadingDef && (
            <div className="mt-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-display text-2xl font-bold leading-tight text-coral">{wordDef.translation}</p>
                {wordDef.pos && (
                  <span className="rounded-full bg-ink-600 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-paper-muted">
                    {wordDef.pos}
                  </span>
                )}
              </div>

              {wordDef.example && (
                <div className="mt-3 border-l-2 border-coral/40 pl-3">
                  <p className="text-sm text-paper">{wordDef.example}</p>
                  {wordDef.example_es && <p className="text-xs text-paper-faint italic">{wordDef.example_es}</p>}
                </div>
              )}

              {wordDef.uses.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                    {ca ? "Altres usos" : "También se usa así"}
                  </p>
                  <ul className="space-y-0.5">
                    {wordDef.uses.map((u) => (
                      <li key={u.en} className="text-sm">
                        <button className="text-left hover:text-coral transition" onClick={() => say(u.en)}>
                          <span className="font-medium">{u.en}</span>
                          <span className="text-paper-muted"> — {u.es}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {saveError && <p className="mt-2 text-coral text-xs">{saveError}</p>}

          <div className="mt-4">
            {selectedStatus === "learning" ? (
              <div className="flex items-center gap-3">
                <p className="flex flex-1 items-center gap-2 text-sm text-gold">
                  <Check size={16} className="animate-check-pop shrink-0" />
                  {ca ? "A la teva pràctica: tornarà al Repàs" : "In your practice. It comes back in Review"}
                </p>
                <button onClick={() => markStatus("known")} disabled={saving} className="text-xs text-paper-muted underline decoration-dotted hover:text-mint disabled:opacity-40">
                  {ca ? "Ja la sé" : "I know it now"}
                </button>
              </div>
            ) : selectedStatus === "known" ? (
              <div className="flex items-center gap-3">
                <p className="flex flex-1 items-center gap-2 text-sm text-mint">
                  <Check size={16} className="shrink-0" />
                  {ca ? "Ja la saps" : "You know this word"}
                </p>
                <button onClick={() => markStatus("learning")} disabled={saving} className="text-xs text-paper-muted underline decoration-dotted hover:text-gold disabled:opacity-40">
                  {ca ? "Practicar-la igualment" : "Practise it anyway"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => markStatus("learning")} disabled={loadingDef || saving} className="btn-coral flex flex-1 items-center justify-center gap-2 py-2.5 text-sm">
                  <Plus size={16} /> {ca ? "Practicar aquesta paraula" : "Practise this word"}
                </button>
                <button onClick={() => markStatus("known")} disabled={loadingDef || saving} className="text-xs text-paper-muted underline decoration-dotted hover:text-mint disabled:opacity-40">
                  {ca ? "Ja la sé" : "I know it"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sentence card */}
      {mode === "sentence" && selectedSentence && (
        <div className="card animate-fade-up mt-3 p-4 sticky bottom-2 z-10 border-mint/30 shadow-[var(--pop-shadow)]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedSentence(null)}
            aria-label="Close"
            className="absolute top-3 right-3 text-paper-faint hover:text-paper"
          >
            <X size={15} />
          </button>

          <p className="pr-6 font-medium leading-snug">{selectedSentence}</p>

          {loadingPhrase && (
            <div className="mt-3 space-y-2 animate-pulse" aria-label="Explaining">
              <div className="h-4 w-4/5 rounded bg-ink-600" />
              <div className="h-4 w-3/5 rounded bg-ink-600" />
            </div>
          )}

          {phraseExpl && !loadingPhrase && (
            <div className="mt-2">
              <p className="text-base text-mint">{phraseExpl.es}</p>
              {phraseExpl.keys.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                    {ca ? "Per aprendre d'aquesta frase" : "Para aprender de esta frase"}
                  </p>
                  <ul className="space-y-0.5">
                    {phraseExpl.keys.map((k) => (
                      <li key={k.en} className="text-sm">
                        <button className="text-left hover:text-mint transition" onClick={() => say(k.en)}>
                          <span className="font-medium">{k.en}</span>
                          <span className="text-paper-muted"> — {k.es}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => say(selectedSentence)} className="flex items-center gap-1.5 rounded-lg bg-ink-600 px-3 py-2 text-sm font-medium transition hover:bg-ink-500">
              <Volume2 size={15} className="text-coral" /> {ca ? "Escoltar" : "Listen"}
            </button>
            <button
              onClick={() => setSayIt((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${sayIt ? "bg-mint/20 text-mint" : "bg-ink-600 hover:bg-ink-500"}`}
            >
              <Mic size={15} className="text-mint" /> {ca ? "Digues-ho" : "Say it"}
            </button>
            <button
              onClick={addPhraseToReview}
              disabled={loadingPhrase || !phraseExpl || phraseInDeck}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                phraseInDeck ? "bg-gold/20 text-gold cursor-default" : "btn-coral disabled:opacity-40"
              }`}
            >
              {phraseInDeck ? <Check size={15} className="animate-check-pop" /> : <Plus size={15} />}
              {phraseInDeck ? (ca ? "A la teva pràctica" : "In your practice") : ca ? "Practicar" : "Practise"}
            </button>
          </div>

          {sayIt && (
            <div className="mt-3">
              <ShadowingBlock text={selectedSentence} lang={voicePrefs.voiceAccent ?? "en-GB"} label={ca ? "Digues-ho" : "Say it"} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

function isWordToken(token: string): boolean {
  return /[a-zA-Z]/.test(token);
}
