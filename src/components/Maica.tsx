export type MaicaMood = "happy" | "celebrating" | "sleeping" | "curious";

const SIZE: Record<"sm" | "md" | "lg", number> = { sm: 64, md: 96, lg: 128 };

// ── Warm grey-taupe tabby palette ──────────────────────────────────────────
const FUR_BASE  = "#9C9284"; // warm grey-taupe (marrón/beige, sin tinte azul)
const FUR_DARK  = "#4A413A"; // marrón-carbón oscuro — rayas, contornos
const FUR_LIGHT = "#E3D5B8"; // crema-beige cálido — panza, patas, hocico
const FUR_MID   = "#7A6E62"; // tono medio para borde de orejas
const EYE_COL   = "#A3A66B"; // verde-oliva amarillento / ámbar
const NOSE_COL  = "#2B211E"; // marrón casi-negro (nariz real de gato)
const EAR_PINK  = "#F9A8D4"; // rosa pálido — interior orejas
const WHISKER   = "#F9FAFB"; // blanquísimo — bigotes
const CHIN      = "#F5EFE0"; // crema cálido — mancha mentón/hocico inferior
// Colores de proyecto para accesorios y efectos
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
    ? "M78 107 Q100 78 88 52"       // erguida
    : sleeping
    ? "M82 118 Q108 120 112 106"    // baja/enrollada
    : "M84 107 Q115 83 97 60";      // default — barre a la derecha

  const tailAnim = celebrating
    ? "maica-tail-up"
    : curious
    ? "maica-tail-flick"
    : sleeping
    ? undefined
    : "maica-tail";

  // Clase de animación para el SVG completo
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
      {/* ── Cola (detrás del cuerpo) ────────────────────────────────────── */}
      <path
        className={tailAnim}
        d={tailPath}
        stroke={FUR_BASE}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
      {/* Anillos atigrados — dasharray con contraste fuerte */}
      <path
        className={tailAnim}
        d={tailPath}
        stroke={FUR_DARK}
        strokeWidth="11"
        strokeDasharray="8 10"
        strokeDashoffset="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />

      {/* ── Cuerpo ──────────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="103" rx="26" ry="20" fill={FUR_BASE} />
      {/* Panza crema-beige */}
      <ellipse cx="60" cy="107" rx="15" ry="11" fill={FUR_LIGHT} />
      {/* Rayas flancos — 3 por lado, strokeWidth=3 para que se vean a 90px */}
      <path d="M35,90 Q46,85 54,93"    stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M34,100 Q45,95 53,103"  stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M35,110 Q45,106 53,113" stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M66,93 Q74,85 85,90"    stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M67,103 Q75,95 86,100"  stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M67,113 Q75,106 85,110" stroke={FUR_DARK} strokeWidth="3" fill="none" strokeLinecap="round"/>

      {/* ── Cabeza ──────────────────────────────────────────────────────── */}
      {/* Separación visual de ~5px entre cabeza (bottom y=78) y cuerpo (top y=83) */}
      <circle cx="60" cy="50" r="28" fill={FUR_BASE} />

      {/* ── Orejas (encima de la cabeza) ─────────────────────────────────── */}
      {/* Oreja izquierda exterior — borde oscuro para definición */}
      <polygon
        points="35,42 42,13 57,40"
        fill={FUR_BASE}
        stroke={FUR_DARK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Oreja izquierda interior — rosa */}
      <polygon points="39,40 42,20 53,39" fill={EAR_PINK} />

      {/* Oreja derecha — animada en modo curious */}
      <g className={curious ? "maica-ear-flick" : undefined}>
        <polygon
          points="63,40 78,13 85,42"
          fill={FUR_BASE}
          stroke={FUR_DARK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon points="67,39 78,20 81,40" fill={EAR_PINK} />
      </g>

      {/* ── Zona de hocico — muzzle bump ─────────────────────────────────── */}
      {/* Parche claro en la parte inferior de la cara — clave para leer "gato" */}
      <ellipse cx="60" cy="63" rx="14" ry="11" fill={FUR_LIGHT} opacity="0.55" />
      {/* Mancha de mentón/chin blaze — rasgo distintivo de la referencia real */}
      <ellipse cx="60" cy="70" rx="8.5" ry="7" fill={CHIN} />

      {/* ── Marcas de frente — M atigrada ─────────────────────────────────── */}
      {/* strokeWidth=2.5 para que sean visibles a 90px */}
      <path d="M49,44 Q49,35 54,39" stroke={FUR_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M58,44 L60,32 L62,44" stroke={FUR_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M66,39 Q71,35 71,44" stroke={FUR_DARK} strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* ── Marcas de mejilla ─────────────────────────────────────────────── */}
      <line x1="38" y1="62" x2="28" y2=  "59" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="37" y1="67" x2="27" y2=  "67" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="82" y1="62" x2="92" y2=  "59" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="83" y1="67" x2="93" y2=  "67" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round"/>

      {/* ── Ojos ────────────────────────────────────────────────────────── */}
      {sleeping ? (
        <>
          {/* Ojos cerrados — arcos */}
          <path d="M41,52 Q46,58 51,52" stroke={FUR_DARK} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M69,52 Q74,58 79,52" stroke={FUR_DARK} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        </>
      ) : celebrating ? (
        <>
          {/* Ojos de celebración — estrella/cruz */}
          <circle cx="48" cy="51" r="8" fill={EYE_COL} />
          <circle cx="72" cy="51" r="8" fill={EYE_COL} />
          <line x1="48" y1="45" x2="48" y2="57" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
          <line x1="42" y1="51" x2="54" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
          <line x1="72" y1="45" x2="72" y2="57" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
          <line x1="66" y1="51" x2="78" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
        </>
      ) : (
        <>
          {/* Ojos normales — verde-oliva con pupila vertical y brillo */}
          <circle className="maica-el" cx="48" cy="51" r="7" fill={EYE_COL} />
          {/* Pupila — ranura vertical de gato */}
          <ellipse cx="48" cy="51" rx="2" ry="4.5" fill={FUR_DARK} opacity="0.85"/>
          {/* Brillo */}
          <circle cx="51" cy="48" r="1.8" fill="white" opacity="0.9"/>

          <circle className="maica-er" cx="72" cy="51" r="7" fill={EYE_COL} />
          <ellipse cx="72" cy="51" rx="2" ry="4.5" fill={FUR_DARK} opacity="0.85"/>
          <circle cx="75" cy="48" r="1.8" fill="white" opacity="0.9"/>
        </>
      )}

      {/* ── Nariz — marrón casi-negro (nariz real de gato, no rosa) ────────── */}
      <ellipse cx="60" cy="62" rx="3.5" ry="2.5" fill={NOSE_COL} />

      {/* ── Boca ────────────────────────────────────────────────────────── */}
      {/* Línea del filtrum (de nariz a boca) */}
      {!sleeping && (
        <line x1="60" y1="64.5" x2="60" y2="66" stroke={FUR_DARK} strokeWidth="1.5" strokeLinecap="round"/>
      )}
      <path
        d={celebrating ? "M54,67 Q60,74 66,67" : sleeping ? "M57,66 Q60,68 63,66" : "M57,66 Q60,70 63,66"}
        stroke={FUR_DARK}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Bigotes — RASGO CLAVE: blanquísimos, 30px de largo, strokeWidth=1.5 */}
      <g className={sleeping ? "maica-whisker-l" : undefined}>
        <line x1="46" y1="61" x2="15" y2="55" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="45" y1="65" x2="13" y2="65" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="46" y1="69" x2="16" y2="74" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
      </g>
      <g className={sleeping ? "maica-whisker-r" : undefined}>
        <line x1="74" y1="61" x2="105" y2="55" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="75" y1="65" x2="107" y2="65" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="74" y1="69" x2="104" y2="74" stroke={WHISKER} strokeWidth="1.5" strokeLinecap="round"/>
      </g>

      {/* ── Moño dorado (accesorio) — oculto en sleeping ─────────────────── */}
      {!sleeping && (
        <g transform="translate(82,36)">
          <path d="M0,0 L-6,-3 L-3.5,0 L-6,3 Z" fill={GOLD} opacity="0.9"/>
          <path d="M0,0 L6,-3 L3.5,0 L6,3 Z"  fill={GOLD} opacity="0.9"/>
          <circle cx="0" cy="0" r="2.2" fill={GOLD}/>
        </g>
      )}

      {/* ── HAPPY — pata izquierda abajo, derecha levemente levantada ──────── */}
      {mood === "happy" && (
        <>
          <ellipse cx="42" cy="122" rx="12" ry="8" fill={FUR_LIGHT}/>
          <ellipse cx="78" cy="114" rx="10" ry="8" fill={FUR_LIGHT} transform="rotate(-20,78,114)"/>
        </>
      )}

      {/* ── CELEBRATING — patas amasando + estrellas ─────────────────────── */}
      {celebrating && (
        <>
          <g className="maica-knead">
            <ellipse cx="37" cy="103" rx="10" ry="8" fill={FUR_LIGHT} transform="rotate(30,37,103)"/>
          </g>
          <g className="maica-knead2">
            <ellipse cx="83" cy="103" rx="10" ry="8" fill={FUR_LIGHT} transform="rotate(-30,83,103)"/>
          </g>
          <text className="maica-s1" x="10" y="82" fontSize="11" fill={GOLD}>✦</text>
          <text className="maica-s2" x="96" y="75" fontSize="11" fill={CORAL}>✦</text>
          <text className="maica-s3" x="5"  y="55" fontSize="9"  fill={MINT}>✦</text>
        </>
      )}

      {/* ── SLEEPING — patas juntas, zzz ─────────────────────────────────── */}
      {sleeping && (
        <>
          <ellipse cx="49" cy="122" rx="12" ry="8" fill={FUR_LIGHT}/>
          <ellipse cx="71" cy="122" rx="12" ry="8" fill={FUR_LIGHT}/>
          <text className="maica-z1" x="85"  y="50" fontSize="11" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z2" x="93"  y="40" fontSize="13" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
          <text className="maica-z3" x="101" y="29" fontSize="15" fill={PAPER} fontFamily="monospace" fontWeight="bold">z</text>
        </>
      )}

      {/* ── CURIOUS — pata derecha levantada + puntos de curiosidad ─────────── */}
      {curious && (
        <>
          <ellipse cx="42" cy="122" rx="12" ry="8" fill={FUR_LIGHT}/>
          <ellipse cx="78" cy="109" rx="10" ry="8" fill={FUR_LIGHT} transform="rotate(-30,78,109)"/>
          <circle cx="97"  cy="42" r="2.5" fill={GOLD} opacity="0.9"/>
          <circle cx="103" cy="33" r="2"   fill={GOLD} opacity="0.65"/>
          <circle cx="108" cy="25" r="1.5" fill={GOLD} opacity="0.4"/>
        </>
      )}
    </svg>
  );
}
