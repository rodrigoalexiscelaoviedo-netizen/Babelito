/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Babelito palette — ink night blue base, warm coral action, mint "correct"
        ink: {
          900: "#0E1320",
          800: "#131A2B",
          700: "#1A2236",
          600: "#222C44",
          500: "#2C3852",
        },
        coral: {
          DEFAULT: "#FF6B5E",
          soft: "#FF8A7E",
          deep: "#E14B3D",
        },
        mint: {
          DEFAULT: "#36C5A8",
          soft: "#5BD6BD",
          deep: "#1FA88D",
        },
        gold: {
          DEFAULT: "#F5B454",
        },
        paper: {
          DEFAULT: "#EAEEF7",
          muted: "#8A93A8",
          faint: "#5A6379",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        // Micro-rebote para checks y logros
        "check-pop": {
          "0%":   { transform: "scale(0)", opacity: "0" },
          "60%":  { transform: "scale(1.25)" },
          "80%":  { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Loader de marca: tres puntos que pulsean en onda
        "wave-dot": {
          "0%, 80%, 100%": { transform: "scaleY(0.4)", opacity: "0.4" },
          "40%": { transform: "scaleY(1)", opacity: "1" },
        },
        // Entrada suave para cards en lista
        "card-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "check-pop": "check-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        "wave-dot": "wave-dot 1.2s ease-in-out infinite",
        "card-in": "card-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
