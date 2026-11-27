import type { CSSProperties } from "react";
import type { TutorMode } from "./TutorStage";

const fill = (token: string, alpha = 1) => `rgb(var(${token}) / ${alpha})`;
const box: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

/**
 * Cara y hombros del coach, dibujados en SVG (sin imágenes ni servicios).
 * Lee el volumen de su voz de la variable CSS `--voice` que pone TutorStage:
 * la boca se abre con el audio real y la cabeza acompaña un poco.
 * Parpadeo y respiración solo con movimiento permitido.
 */
export default function TutorAvatar({ mode }: { mode: TutorMode }) {
  const speaking = mode === "speaking";
  const thinking = mode === "thinking";
  const listening = mode === "listening";

  // Mirada: arriba a un lado al pensar, al frente el resto del tiempo.
  const gaze = thinking ? "translate(3px, -3px)" : "translate(0, 0)";
  const brow = thinking || listening ? "translateY(-2.5px)" : "translateY(0)";
  const tilt = speaking ? "rotate(calc(var(--voice) * 3deg))" : listening ? "rotate(-2.5deg)" : "rotate(0deg)";

  return (
    <svg
      viewBox="0 0 240 250"
      aria-hidden
      className={`h-full w-auto transition-opacity duration-500 ${mode === "connecting" ? "opacity-50" : "opacity-100"}`}
      data-testid="tutor-avatar"
    >
      <g className="motion-safe:animate-avatar-breathe">
        {/* Hombros y jersey */}
        <path d="M14 250 C 18 210, 52 190, 92 184 L 148 184 C 188 190, 222 210, 226 250 Z" fill={fill("--mint-deep")} />
        <path d="M92 184 C 100 204, 140 204, 148 184 Z" fill={fill("--avatar-shirt")} />
        <path d="M92 184 C 100 204, 140 204, 148 184" fill="none" stroke={fill("--mint-deep")} strokeWidth="5" strokeLinecap="round" />

        {/* Cuello */}
        <path d="M103 150 L 103 186 C 110 194, 130 194, 137 186 L 137 150 Z" fill={fill("--avatar-skin-shade")} />

        <path d="M103 158 C 110 170, 130 170, 137 158 L 137 168 C 130 176, 110 176, 103 168 Z" fill={fill("--avatar-hair", 0.18)} />

        {/* Cabeza: gira un poco desde el cuello */}
        <g style={{ transformBox: "view-box", transformOrigin: "120px 170px", transform: tilt, transition: "transform 0.4s ease" }}>
          {/* Pelo de atrás */}
          <path d="M64 108 C 58 52, 96 34, 124 36 C 160 38, 186 62, 178 116 C 176 132, 172 142, 168 146 L 72 146 C 66 136, 64 124, 64 108 Z" fill={fill("--avatar-hair")} />

          {/* Orejas */}
          <ellipse cx="71" cy="114" rx="8" ry="12" fill={fill("--avatar-skin-shade")} />
          <ellipse cx="169" cy="114" rx="8" ry="12" fill={fill("--avatar-skin-shade")} />

          {/* Cara */}
          <path d="M72 104 C 72 64, 96 52, 120 52 C 144 52, 168 64, 168 104 C 168 140, 146 166, 120 166 C 94 166, 72 140, 72 104 Z" fill={fill("--avatar-skin")} />

          {/* Flequillo */}
          <path d="M70 100 C 70 62, 96 42, 126 44 C 152 46, 172 66, 170 98 C 160 80, 146 70, 128 68 C 118 78, 100 86, 70 100 Z" fill={fill("--avatar-hair")} />

          {/* Cejas */}
          <g style={{ ...box, transform: brow, transition: "transform 0.3s ease" }}>
            <path d="M90 96 C 96 91, 106 91, 111 95" fill="none" stroke={fill("--avatar-hair")} strokeWidth="4" strokeLinecap="round" />
            <path d="M129 95 C 134 91, 144 91, 150 96" fill="none" stroke={fill("--avatar-hair")} strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Ojos: parpadean */}
          <g className="motion-safe:animate-avatar-blink" style={box}>
            <g style={{ transform: gaze, transition: "transform 0.4s ease" }}>
              <ellipse cx="101" cy="111" rx="4.8" ry="5.6" fill={fill("--avatar-hair")} />
              <ellipse cx="139" cy="111" rx="4.8" ry="5.6" fill={fill("--avatar-hair")} />
              <circle cx="102.6" cy="109.2" r="1.5" fill="white" />
              <circle cx="140.6" cy="109.2" r="1.5" fill="white" />
            </g>
            <path d="M93 107 C 97 103, 105 103, 109 107" fill="none" stroke={fill("--avatar-hair")} strokeWidth="2" strokeLinecap="round" />
            <path d="M131 107 C 135 103, 143 103, 147 107" fill="none" stroke={fill("--avatar-hair")} strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Nariz y mejillas */}
          <path d="M119 118 C 117 125, 116 128, 122 129" fill="none" stroke={fill("--avatar-skin-shade")} strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="130" r="8" fill={fill("--coral-soft", 0.22)} />
          <circle cx="148" cy="130" r="8" fill={fill("--coral-soft", 0.22)} />

          {/* Boca: sonrisa cerrada que se abre con la voz */}
          <path
            d="M108 143 C 114 149, 126 149, 132 143"
            fill="none"
            stroke={fill("--avatar-mouth")}
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ opacity: speaking ? "calc(1 - var(--voice) * 4)" : 1 }}
          />
          <g style={{ ...box, transformOrigin: "center top", transform: "scaleY(calc(0.25 + var(--voice) * 1.1))", opacity: speaking ? "calc(var(--voice) * 4)" : 0 }}>
            <path d="M107 142 C 112 141, 128 141, 133 142 C 132 154, 108 154, 107 142 Z" fill={fill("--avatar-mouth")} />
            <path d="M112 149 C 116 146, 124 146, 128 149 C 124 152, 116 152, 112 149 Z" fill={fill("--coral-soft", 0.85)} />
          </g>
        </g>
      </g>
    </svg>
  );
}
