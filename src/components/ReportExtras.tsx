import { useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { addToReview } from "../lib/srs";

/** XP ganado en la sesión, mostrado en el informe. */
export function XpEarned({ amount, learningLanguage }: { amount: number | null; learningLanguage: string }) {
  if (!amount) return null;
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full status-streak-bg px-3 py-1 text-sm font-semibold level-up-pop">
      <Sparkles size={14} /> +{amount} XP {learningLanguage === "ca" ? "guanyats" : "earned"}
    </p>
  );
}

/**
 * Frases sugeridas por el coach, cada una con un botón para guardarla en el
 * repaso (SRS). Antes solo se mostraban y se perdían al cerrar el informe.
 */
export function SuggestedChunks({
  chunks,
  userId,
  learningLanguage,
  title,
}: {
  chunks: string[];
  userId: string | undefined;
  learningLanguage: string;
  title: string;
}) {
  const [saved, setSaved] = useState<Record<string, "added" | "exists" | "error" | "saving">>({});
  const ca = learningLanguage === "ca";

  async function save(chunk: string) {
    if (!userId || saved[chunk]) return;
    setSaved((s) => ({ ...s, [chunk]: "saving" }));
    const result = await addToReview(
      userId,
      {
        item_type: "chunk",
        content: chunk,
        prompt: ca ? "Expressió suggerida pel coach" : "Phrase suggested by your coach",
        source_ref: `coach:${chunk.toLowerCase().slice(0, 120)}`,
      },
      learningLanguage
    );
    setSaved((s) => ({ ...s, [chunk]: result }));
  }

  if (chunks.length === 0) return null;

  return (
    <div className="card p-5 mb-6">
      <p className="eyebrow text-gold mb-3">{title}</p>
      <ul className="space-y-2">
        {chunks.map((chunk) => {
          const state = saved[chunk];
          const done = state === "added" || state === "exists";
          return (
            <li key={chunk} className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-paper-muted">"{chunk}"</span>
              <button
                onClick={() => save(chunk)}
                disabled={!!state && state !== "error"}
                className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  done ? "bg-mint/15 text-mint" : "bg-ink-600 text-paper hover:bg-ink-500"
                }`}
                aria-label={ca ? `Desa "${chunk}" al repàs` : `Save "${chunk}" to review`}
              >
                {done ? <Check size={13} /> : <Plus size={13} />}
                {done
                  ? ca ? "Desat" : "Saved"
                  : state === "error"
                  ? ca ? "Torna-ho a provar" : "Try again"
                  : ca ? "Al repàs" : "Review"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
