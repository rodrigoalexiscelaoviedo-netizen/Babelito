import { useEffect } from "react";
import Confetti, { haptic } from "./Confetti";
import type { AchievementDef } from "../lib/achievements";
import Maica from "./Maica";


interface Props {
  achievements: AchievementDef[];
  onClose: () => void;
}

export default function AchievementCelebration({ achievements, onClose }: Props) {
  // Vibra una sola vez por tanda de logros (onClose cambia en cada render del padre).
  useEffect(() => {
    if (achievements.length > 0) haptic([15, 50, 15]);
  }, [achievements]);

  useEffect(() => {
    if (achievements.length === 0) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [achievements, onClose]);

  if (achievements.length === 0) return null;

  const single = achievements.length === 1 ? achievements[0] : null;

  return (
    <div className="overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-ink-900/85 backdrop-blur-md" onClick={onClose} role="dialog" aria-label="Achievement unlocked">
        <div className="card relative mx-4 w-full max-w-xs animate-pop-in p-8 text-center">
          <Confetti pieces={30} spread={180} />
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper-faint mb-3">
            {achievements.length === 1 ? "Achievement unlocked 🏆" : `${achievements.length} achievements unlocked 🏆`}
          </p>

          {single ? (
            <>
              <div className="mb-2">
                <Maica mood="celebrating" size="md" className="mx-auto" />
              </div>
              <h2 className="font-display text-2xl font-extrabold mb-2">{single.title}</h2>
              <p className="text-sm text-paper-muted leading-relaxed">{single.description}</p>
            </>
          ) : (
            <>
              <Maica mood="celebrating" size="sm" className="mx-auto mb-1" />
              <div className="space-y-2 mt-1 mb-2">
                {achievements.map((a) => (
                  <div key={a.key} className="flex items-center gap-2 justify-center">
                    <span className="text-xs text-gold">✦</span>
                    <span className="font-display font-bold">{a.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-xs text-paper-faint mt-5">Tap anywhere to continue</p>
        </div>
    </div>
  );
}
