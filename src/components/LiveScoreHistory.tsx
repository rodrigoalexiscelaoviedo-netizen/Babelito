import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loadScoreHistory, type ScoreRecord } from "../lib/liveReview";

const SHOWN = 6;

/** Evolución de las notas de las llamadas en vivo. No aparece hasta la primera nota. */
export default function LiveScoreHistory() {
  const { profile } = useAuth();
  const isEnglish = (profile?.learning_language || "en") === "en";
  const [records, setRecords] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    if (!profile || !isEnglish) return;
    let cancelled = false;
    void loadScoreHistory(profile.id)
      .then((list) => {
        if (!cancelled) setRecords(list);
      })
      .catch(() => {
        /* sin historial: la tarjeta no aparece */
      });
    return () => {
      cancelled = true;
    };
  }, [profile, isEnglish]);

  if (!isEnglish || records.length === 0) return null;

  return (
    <section className="card mb-6 p-5" aria-labelledby="live-scores-title">
      <h2 id="live-scores-title" className="eyebrow mb-1">Your live calls</h2>
      <p className="mb-3 text-xs text-paper-muted">AI estimates out of 100 from each call's transcript. Look at the trend, not a single call.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-paper-faint">
            <th scope="col" className="py-1 font-normal">Call</th>
            <th scope="col" className="py-1 text-right font-normal">Grammar</th>
            <th scope="col" className="py-1 text-right font-normal">Vocabulary</th>
            <th scope="col" className="py-1 text-right font-normal">Fluency</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {records.slice(-SHOWN).reverse().map((r) => (
            <tr key={r.at} className="border-t border-ink-600">
              <th scope="row" className="py-1.5 text-left font-sans font-normal">
                {new Date(r.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </th>
              <td className="py-1.5 text-right">{r.grammar}</td>
              <td className="py-1.5 text-right">{r.vocabulary}</td>
              <td className="py-1.5 text-right">{r.fluency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
