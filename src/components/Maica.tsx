export type MaicaMood = "happy" | "celebrating" | "sleeping" | "curious";

const SIZE: Record<"sm" | "md" | "lg", number> = { sm: 64, md: 96, lg: 128 };

// ── Grey tabby palette ─────────────────────────────────────────────────────
const CAT_BASE  = "#8B8FA8"; // medium blue-grey base fur
const CAT_DARK  = "#595B70"; // darker — stripes, ear depth, outlines
const CAT_LIGHT = "#C4C6D3"; // lighter — belly, muzzle, paws
const CAT_EYE   = "#4BB865"; // green eyes
const CAT_NOSE  = "#E8879A"; // pink nose & mouth
const CAT_PINK  = "#CC9EAA"; // inner ear warm pink
// Project accent colours for effects / accessories
const GOLD  = "#C9A227";
const CORAL = "#FF6B5E";
const MINT  = "#2C9E86";
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
  const curious     = mood === "curious";

  // Tail path per mood
  const tailPath = celebrating
    ? "M78 107 Q100 78 88 52"       // erect — curls up to the right
    : sleeping
    ? "M82 118 Q108 120 112 106"    // low, coiled at rest
    : "M86 107 Q115 85 97 60";      // default — sweeps out right

  const tailAnim = celebrating
    ? "maica-tail-up"
    : curious
    ? "maica-tail-flick"
    : sleeping
    ? undefined
    : "maica-tail";

  // Whole-SVG animation class
  const svgAnim = celebrating
    ? "maica-pounce"
    : sleeping
    ? "maica-breathe-sleep"
    : "maica-breathe";

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 120 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${svgAnim} ${className}`.trim()}
      aria-label="Maica"
      role="img"
    >
      {/* ── Tail (rendered first — behind body) ─────────────────────────── */}
      <path
        className={tailAnim}
        d={tailPath}
        stroke={CAT_BASE}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tabby ring overlay via dasharray */}
      <path
        className={tailAnim}
        d={tailPath}
        stroke={CAT_DARK}
        strokeWidth="10"
        strokeDasharray="7 11"
        strokeDashoffset="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="103" rx="28" ry="21" fill={CAT_BASE} />
      {/* Belly — lighter patch */}
      <ellipse cx="60" cy="107" rx="15" ry="11" fill={CAT_LIGHT} />
      {/* Flank tabby stripes */}
      <path d="M37 95 Q49 89 57 97"  stroke={CAT_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M40 110 Q52 104 60 112" stroke={CAT_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* ── Head ─────────────────────────────────────────────────────────── */}
      <circle cx="60" cy="55" r="31" fill={CAT_BASE} />

      {/* Left ear */}
      <polygon points="28,46 40,14 55,44" fill={CAT_BASE} />
      <polygon points="33,43 40,22 51,42" fill={CAT_PINK} />

      {/* Right ear — animated when curious */}
      <g className={curious ? "maica-ear-flick" : undefined}>
        <polygon points="65,44 80,14 92,46" fill={CAT_BASE} />
        <polygon points="69,42 80,22 87,43" fill={CAT_PINK} />
      </g>

      {/* Muzzle lighter patch */}
      <ellipse cx="60" cy="67" rx="15" ry="11" fill={CAT_LIGHT} opacity="0.42" />

      {/* ── Forehead "M" tabby marking ───────────────────────────────────── */}
      <path d="M51 44 Q50 36 55 39" stroke={CAT_DARK} strokeWidth="1.9" fill="none" strokeLinecap="round" opacity="0.88" />
      <path d="M59 44 Q60 32 61 44" stroke={CAT_DARK} strokeWidth="1.9" fill="none" strokeLinecap="round" opacity="0.88" />
      <path d="M65 39 Q70 36 69 44" stroke={CAT_DARK} strokeWidth="1.9" fill="none" strokeLinecap="round" opacity="0.88" />

      {/* ── Cheek stripe marks ───────────────────────────────────────────── */}
      <line x1="37" y1="61" x2="27" y2="58" stroke={CAT_DARK} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <line x1="36" y1="66" x2="26" y2="65" stroke={CAT_DARK} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <line x1="83" y1="61" x2="93" y2="58" stroke={CAT_DARK} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <line x1="84" y1="66" x2="94" y2="65" stroke={CAT_DARK} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />

      {/* ── Eyes (vary by mood) ──────────────────────────────────────────── */}
      {sleeping ? (
        <>
          <path d="M41 55 Q46 61 51 55" stroke={CAT_DARK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M69 55 Q74 61 79 55" stroke={CAT_DARK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : celebrating ? (
        <>
          {/* Sparkle eyes */}
          <circle cx="46" cy="55" r="8.5" fill={CAT_EYE} />
          <circle cx="74" cy="55" r="8.5" fill={CAT_EYE} />
          <line x1="46" y1="49" x2="46" y2="61" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.85" />
          <line x1="40" y1="55" x2="52" y2="55" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.85" />
          <line x1="74" y1="49" x2="74" y2="61" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.85" />
          <line x1="68" y1="55" x2="80" y2="55" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.85" />
        </>
      ) : (
        <>
          {/* Normal / curious — slow cat-kiss blink */}
          <circle className="maica-el" cx="46" cy="55" r="7.5" fill={CAT_EYE} />
          <circle cx="49" cy="52" r="2.5" fill="white" opacity="0.9" />
          <circle className="maica-er" cx="74" cy="55" r="7.5" fill={CAT_EYE} />
          <circle cx="77" cy="52" r="2.5" fill="white" opacity="0.9" />
        </>
      )}

      {/* ── Nose ─────────────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="65" rx="3.5" ry="2.5" fill={CAT_NOSE} />

      {/* ── Mouth ────────────────────────────────────────────────────────── */}
      <path
        d={celebrating ? "M54 70 Q60 78 66 70" : sleeping ? "M56 68 Q60 71 64 68" : "M54 69 Q60 75 66 69"}
        stroke={CAT_NOSE}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Whiskers ─────────────────────────────────────────────────────── */}
      <g className={sleeping ? "maica-whisker-l" : undefined}>
        <line x1="44" y1="62" x2="22" y2="57" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.8" />
        <line x1="43" y1="67" x2="21" y2="67" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.8" />
        <line x1="44" y1="72" x2="23" y2="76" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.7" />
      </g>
      <g className={sleeping ? "maica-whisker-r" : undefined}>
        <line x1="76" y1="62" x2="98" y2="57" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.8" />
        <line x1="77" y1="67" x2="99" y2="67" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.8" />
        <line x1="76" y1="72" x2="97" y2="76" stroke={CAT_LIGHT} strokeWidth="1"   strokeLinecap="round" opacity="0.7" />
      </g>

      {/* ── Gold bow (collar accessory) — hidden when sleeping ────────────── */}
      {!sleeping && (
        <g transform="translate(82,38)">
          <path d="M0,0 L-6,-3 L-3.5,0 L-6,3 Z" fill={GOLD} opacity="0.9" />
          <path d="M0,0 L6,-3 L3.5,0 L6,3 Z"  fill={GOLD} opacity="0.9" />
          <circle cx="0" cy="0" r="2.2" fill={GOLD} />
        </g>
      )}

      {/* ── HAPPY — left paw resting, right paw gently raised ────────────── */}
      {mood === "happy" && (
        <>
          <ellipse cx="43" cy="121" rx="11" ry="7" fill={CAT_LIGHT} />
          <ellipse cx="78" cy="113" rx="9"  ry="7" fill={CAT_LIGHT} transform="rotate(-20,78,113)" />
        </>
      )}

      {/* ── CELEBRATING — both paws kneading + floating stars ────────────── */}
      {celebrating && (
        <>
          <g className="maica-knead">
            <ellipse cx="38" cy="103" rx="9" ry="7" fill={CAT_LIGHT} transform="rotate(30,38,103)" />
          </g>
          <g className="maica-knead2">
            <ellipse cx="82" cy="103" rx="9" ry="7" fill={CAT_LIGHT} transform="rotate(-30,82,103)" />
          </g>
          <text className="maica-s1" x="10" y="82" fontSize="11" fill={GOLD}>✦</text>
          <text className="maica-s2" x="96" y="75" fontSize="11" fill={CORAL}>✦</text>
          <text className="maica-s3" x="5"  y="55" fontSize="9"  fill={MINT}>✦</text>
        </>
      )}

      {/* ── SLEEPING — paws tucked, z's floating ─────────────────────────── */}
      {sleeping && (
        <>
          <ellipse cx="50" cy="121" rx="11" ry="7" fill={CAT_LIGHT} />
          <ellipse cx="70" cy="121" rx="11" ry="7" fill={CAT_LIGHT} />
          <text className="maica-z1" x="85"  y="50" fontSize="11" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z2" x="93"  y="40" fontSize="13" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z3" x="101" y="29" fontSize="15" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* ── CURIOUS — raised paw + ear flick (on group above) + wonder dots ─ */}
      {curious && (
        <>
          <ellipse cx="43" cy="121" rx="11" ry="7" fill={CAT_LIGHT} />
          <ellipse cx="78" cy="108" rx="9"  ry="7" fill={CAT_LIGHT} transform="rotate(-30,78,108)" />
          <circle cx="97"  cy="42" r="2.5" fill={GOLD} opacity="0.9" />
          <circle cx="103" cy="33" r="2"   fill={GOLD} opacity="0.65" />
          <circle cx="108" cy="25" r="1.5" fill={GOLD} opacity="0.4" />
        </>
      )}
    </svg>
  );
}
