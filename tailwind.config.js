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
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
