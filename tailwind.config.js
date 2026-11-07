/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Los valores viven en index.css (tema Día por defecto, Noche con data-theme="night").
        ink: {
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
        },
        coral: {
          DEFAULT: "rgb(var(--coral) / <alpha-value>)",
          soft: "rgb(var(--coral-soft) / <alpha-value>)",
          deep: "rgb(var(--coral-deep) / <alpha-value>)",
        },
        mint: {
          DEFAULT: "rgb(var(--mint) / <alpha-value>)",
          soft: "rgb(var(--mint-soft) / <alpha-value>)",
          deep: "rgb(var(--mint-deep) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--gold) / <alpha-value>)",
          soft: "rgb(var(--gold-soft) / <alpha-value>)",
        },
        sky: {
          DEFAULT: "rgb(var(--sky) / <alpha-value>)",
          soft: "rgb(var(--sky-soft) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          muted: "rgb(var(--paper-muted) / <alpha-value>)",
          faint: "rgb(var(--paper-faint) / <alpha-value>)",
        },
        // Texto oscuro fijo para ponerlo sobre el dorado en cualquier tema.
        ongold: "rgb(28 27 24 / <alpha-value>)",
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
