export type MaicaMood = "happy" | "celebrating" | "sleeping" | "curious";

const SIZE: Record<"sm" | "md" | "lg", number> = { sm: 64, md: 96, lg: 128 };

const INK   = "#243048";
const CORAL = "#FF6B5E";
const MINT  = "#2C9E86";
const GOLD  = "#C9A227";
const PAPER = "#E8E4DC";

interface MaicaProps {
  mood?: MaicaMood;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Maica({ mood = "happy", size = "md", className = "" }: MaicaProps) {
  const px = SIZE[size];
  const sleeping    = mood === "sleeping";
  const celebrating = mood === "celebrating";

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`maica-breathe ${className}`}
      aria-label="Maica"
      role="img"
    >
      {/* ── Tail — behind body ─────────────────────────────────────────── */}
      <path
        className="maica-tail"
        d="M86 107 Q115 85 97 60"
        stroke={INK}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="103" rx="28" ry="21" fill={INK} />

      {/* ── Head ──────────────────────────────────────────────────────── */}
      <circle cx="60" cy="55" r="31" fill={INK} />

      {/* Ear outers — same fill as head so they merge seamlessly */}
      <polygon points="28,46 40,14 55,44" fill={INK} />
      <polygon points="65,44 80,14 92,46" fill={INK} />

      {/* Ear inners — coral accent */}
      <polygon points="33,43 40,22 51,42" fill={CORAL} />
      <polygon points="69,42 80,22 87,43" fill={CORAL} />

      {/* ── Eyes ──────────────────────────────────────────────────────── */}
      {sleeping ? (
        <>
          <path d="M41 55 Q46 61 51 55" stroke={MINT} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M69 55 Q74 61 79 55" stroke={MINT} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : celebrating ? (
        <>
          <circle cx="46" cy="55" r="8.5" fill={MINT} />
          <circle cx="74" cy="55" r="8.5" fill={MINT} />
          {/* Cross-shine for sparkle eyes */}
          <line x1="46" y1="49" x2="46" y2="61" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <line x1="40" y1="55" x2="52" y2="55" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <line x1="74" y1="49" x2="74" y2="61" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <line x1="68" y1="55" x2="80" y2="55" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </>
      ) : (
        <>
          <circle className="maica-el" cx="46" cy="55" r="7.5" fill={MINT} />
          <circle cx="49" cy="52" r="2.5" fill="white" />
          <circle className="maica-er" cx="74" cy="55" r="7.5" fill={MINT} />
          <circle cx="77" cy="52" r="2.5" fill="white" />
          {/* Eyelashes — feminine touch */}
          <line x1="39" y1="48" x2="37" y2="45" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <line x1="46" y1="47" x2="46" y2="44" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <line x1="53" y1="48" x2="55" y2="45" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <line x1="67" y1="48" x2="65" y2="45" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <line x1="74" y1="47" x2="74" y2="44" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <line x1="81" y1="48" x2="83" y2="45" stroke={PAPER} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        </>
      )}

      {/* ── Nose ──────────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="65" rx="3.5" ry="2.5" fill={CORAL} />

      {/* ── Mouth ─────────────────────────────────────────────────────── */}
      <path
        d={celebrating ? "M54 70 Q60 78 66 70" : sleeping ? "M56 69 Q60 72 64 69" : "M54 69 Q60 75 66 69"}
        stroke={CORAL}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Bow (moñito) — near right ear, hidden when sleeping ───────── */}
      {!sleeping && (
        <g transform="translate(82,38)">
          <path d="M0,0 L-6,-3 L-3.5,0 L-6,3 Z" fill={CORAL} opacity="0.85" />
          <path d="M0,0 L6,-3 L3.5,0 L6,3 Z" fill={CORAL} opacity="0.85" />
          <circle cx="0" cy="0" r="2.2" fill={CORAL} />
        </g>
      )}

      {/* ── Mood-specific paws & extras ───────────────────────────────── */}

      {/* HAPPY: left paw down, right paw waving */}
      {mood === "happy" && (
        <>
          <ellipse cx="43" cy="121" rx="11" ry="7" fill={INK} />
          <g className="maica-paw">
            <ellipse cx="78" cy="110" rx="9" ry="7" fill={INK} transform="rotate(-25,78,110)" />
          </g>
        </>
      )}

      {/* CELEBRATING: both paws up + floating stars */}
      {celebrating && (
        <>
          <g className="maica-paw">
            <ellipse cx="37" cy="103" rx="9" ry="7" fill={INK} transform="rotate(35,37,103)" />
          </g>
          <g className="maica-paw2">
            <ellipse cx="83" cy="103" rx="9" ry="7" fill={INK} transform="rotate(-35,83,103)" />
          </g>
          <text className="maica-s1" x="14" y="84" fontSize="11" fill={GOLD}>✦</text>
          <text className="maica-s2" x="95" y="77" fontSize="11" fill={CORAL}>✦</text>
          <text className="maica-s3" x="7"  y="56" fontSize="9"  fill={MINT}>✦</text>
        </>
      )}

      {/* SLEEPING: tucked paws + floating z z z */}
      {sleeping && (
        <>
          <ellipse cx="47" cy="121" rx="11" ry="7" fill={INK} />
          <ellipse cx="73" cy="121" rx="11" ry="7" fill={INK} />
          <text className="maica-z1" x="85" y="50"  fontSize="11" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z2" x="94" y="40"  fontSize="13" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z3" x="102" y="29" fontSize="15" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* CURIOUS: right paw raised, golden wonder dots */}
      {mood === "curious" && (
        <>
          <ellipse cx="43" cy="121" rx="11" ry="7" fill={INK} />
          <g className="maica-paw">
            <ellipse cx="78" cy="110" rx="9" ry="7" fill={INK} transform="rotate(-25,78,110)" />
          </g>
          <circle cx="97" cy="42" r="2.5" fill={GOLD} opacity="0.8" />
          <circle cx="102" cy="33" r="2"   fill={GOLD} opacity="0.6" />
          <circle cx="106" cy="25" r="1.5" fill={GOLD} opacity="0.4" />
        </>
      )}
    </svg>
  );
}
