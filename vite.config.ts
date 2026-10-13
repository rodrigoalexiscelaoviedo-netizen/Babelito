import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Service worker propio (src/sw.ts): precache offline + push de recordatorios.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
      manifest: false, // se usa public/manifest.json
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    // Chunks estables para cachear entre despliegues. Sin recharts (ver components/Charts.tsx).
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          i18n: ["i18next", "react-i18next"],
        },
      },
    },
  },
});
