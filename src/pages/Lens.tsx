import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Camera, ChevronDown, ChevronUp, Loader2, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVoicePrefs } from "../lib/useVoicePrefs";
import { speak, stopSpeech } from "../lib/speech";
import { addToReview } from "../lib/srs";
import ShadowingBlock from "../components/ShadowingBlock";
import { explainPhoto, geminiToolsAvailable, photoToJpegBase64, type PhotoResult } from "../lib/geminiTools";

export default function Lens() {
  const { profile } = useAuth();
  const prefs = useVoicePrefs();
  const inputRef = useRef<HTMLInputElement>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PhotoResult | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [saved, setSaved] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void geminiToolsAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (profile?.learning_language === "ca") return <Navigate to="/" replace />;

  const say = (text: string) => speak(text, { voiceName: prefs.voiceName ?? undefined, rate: prefs.voiceRate, lang: prefs.voiceAccent });

  async function onFile(file: File | undefined) {
    if (!file || !profile) return;
    setError("");
    setResult(null);
    setSaved("");
    setOpen(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const b64 = await photoToJpegBase64(file);
      const r = await explainPhoto(b64, profile.current_level ?? "A2");
      if (!r) setError("I could not read anything useful in this photo. Try a closer, brighter one.");
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyse the photo.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    if (!profile || !result) return;
    const lang = profile.learning_language || "en";
    const jobs = [
      ...result.vocabulary.map((v) => addToReview(profile.id, { item_type: "word", content: v.en, prompt: v.es, source_ref: "lens" }, lang)),
      ...result.phrases.map((p) => addToReview(profile.id, { item_type: "chunk", content: p.en, prompt: p.es, source_ref: "lens" }, lang)),
    ];
    const res = await Promise.all(jobs);
    setSaved(`${res.filter((r) => r === "added").length} new item(s) added to your review.`);
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <p className="eyebrow mb-2">Photo helper</p>
      <h1 className="page-title mb-2">Point, shoot, understand</h1>
      <p className="mb-6 text-paper-muted">
        Take a photo of a menu, a sign, a label or a ticket. The coach explains it in simple English and gives you the words and phrases you need.
      </p>

      {available === false ? (
        <div className="card p-5 text-sm text-paper-muted">This feature is not available right now. Try again later.</div>
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <button className="btn-coral flex w-full items-center justify-center gap-2" onClick={() => inputRef.current?.click()} disabled={loading || available === null}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {loading ? "Reading the photo…" : "Take or choose a photo"}
          </button>
        </>
      )}

      {error && <p className="mt-4 text-sm text-coral">{error}</p>}

      {preview && <img src={preview} alt="Your photo" className="mt-5 max-h-64 w-full rounded-xl object-contain bg-ink-800" />}

      {result && (
        <div className="mt-6 space-y-5">
          <section className="card p-5">
            {result.kind && <p className="eyebrow mb-1">{result.kind}</p>}
            <p className="font-medium leading-relaxed">{result.summary}</p>
            {result.summaryEs && <p className="mt-2 text-sm text-paper-muted">{result.summaryEs}</p>}
            {result.summary && (
              <button onClick={() => say(result.summary)} className="mt-3 flex items-center gap-1.5 text-xs text-paper-muted transition hover:text-coral">
                <Volume2 size={13} /> Listen
              </button>
            )}
          </section>

          {result.vocabulary.length > 0 && (
            <section>
              <h2 className="mb-2 font-display text-lg font-bold">Words from the photo</h2>
              <div className="flex flex-wrap gap-2">
                {result.vocabulary.map((v) => (
                  <button key={v.en} onClick={() => say(v.en)} className="flex items-center gap-1.5 rounded-full bg-ink-700 px-3 py-1.5 text-sm transition hover:bg-ink-600">
                    <Volume2 size={12} className="text-paper-faint" />
                    <span className="font-medium">{v.en}</span>
                    <span className="text-xs text-paper-muted">· {v.es}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {result.phrases.length > 0 && (
            <section>
              <h2 className="mb-2 font-display text-lg font-bold">Useful things to say</h2>
              <ul className="space-y-2">
                {result.phrases.map((p, i) => (
                  <li key={p.en} className="card p-3">
                    <div className="flex items-start gap-3">
                      <button onClick={() => say(p.en)} className="mt-0.5 text-paper-faint transition hover:text-coral" aria-label={`Listen: ${p.en}`}>
                        <Volume2 size={16} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.en}</p>
                        <p className="text-xs text-paper-muted">{p.es}</p>
                      </div>
                      <button onClick={() => setOpen(open === i ? null : i)} className="flex shrink-0 items-center gap-1 text-xs text-paper-muted hover:text-paper" aria-expanded={open === i}>
                        Say it {open === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                    {open === i && (
                      <div className="mt-3">
                        <ShadowingBlock text={p.en} label="Listen & repeat" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(result.vocabulary.length > 0 || result.phrases.length > 0) && (
            <div>
              <button className="btn-ghost w-full" onClick={saveAll}>
                Add everything to my review
              </button>
              {saved && <p className="mt-2 text-center text-xs text-mint">✓ {saved}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
