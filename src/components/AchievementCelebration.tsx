import { useEffect } from "react";
import {
  MessageCircle,
  BookOpen,
  Layers,
  Mic,
  BookMarked,
  Flame,
  Trophy,
} from "lucide-react";
import type { AchievementDef } from "../lib/achievements";

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageCircle: <MessageCircle size={52} className="text-coral mx-auto" />,
  BookOpen: <BookOpen size={52} className="text-mint mx-auto" />,
  Layers: <Layers size={52} className="text-gold mx-auto" />,
  Mic: <Mic size={52} className="text-coral mx-auto" />,
  BookMarked: <BookMarked size={52} className="text-mint mx-auto" />,
  Flame: <Flame size={52} className="text-coral mx-auto" />,
  Trophy: <Trophy size={52} className="text-gold mx-auto" />,
};

interface Props {
  achievements: AchievementDef[];
  onClose: () => void;
}

export default function AchievementCelebration({ achievements, onClose }: Props) {
  useEffect(() => {
    if (achievements.length === 0) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [achievements, onClose]);

  if (achievements.length === 0) return null;

  const single = achievements.length === 1 ? achievements[0] : null;

  return (
    <>
      <style>{`
        @keyframes bbl-ach-up { from { transform: scale(0.7) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .bbl-ach-card { animation: bbl-ach-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(10,16,30,0.88)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <div className="card max-w-xs w-full mx-4 p-8 text-center bbl-ach-card">
          {/* Confetti strip */}
          <svg viewBox="0 0 220 36" className="w-full mb-3" aria-hidden="true">
            {[
              { cx: 12,  cy: 18, r: 5,  fill: "#F7C948" },
              { cx: 38,  cy: 8,  r: 4,  fill: "#FF6B5E" },
              { cx: 66,  cy: 24, r: 6,  fill: "#36C5A8" },
              { cx: 94,  cy: 10, r: 4,  fill: "#F7C948" },
              { cx: 120, cy: 26, r: 5,  fill: "#FF6B5E" },
              { cx: 148, cy: 8,  r: 6,  fill: "#36C5A8" },
              { cx: 176, cy: 22, r: 4,  fill: "#F7C948" },
              { cx: 205, cy: 12, r: 5,  fill: "#FF6B5E" },
            ].map((c, i) => (
              <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill} opacity={0.9} />
            ))}
          </svg>

          <p className="font-mono text-[10px] uppercase tracking-widest text-paper-faint mb-3">
            {achievements.length === 1 ? "Achievement unlocked 🏆" : `${achievements.length} achievements unlocked 🏆`}
          </p>

          {single ? (
            <>
              <div className="mb-4">{ICON_MAP[single.icon] ?? <Trophy size={52} className="text-gold mx-auto" />}</div>
              <h2 className="font-display text-2xl font-extrabold mb-2">{single.title}</h2>
              <p className="text-sm text-paper-muted leading-relaxed">{single.description}</p>
            </>
          ) : (
            <>
              <Trophy size={44} className="text-gold mx-auto mb-3" />
              <div className="space-y-2 mt-2 mb-2">
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
    </>
  );
}
