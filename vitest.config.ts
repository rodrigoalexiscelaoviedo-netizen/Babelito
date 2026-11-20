import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Pruebas de lógica (.ts) en node; pruebas de pantallas y flujos (.tsx) con DOM simulado.
    environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    // Los módulos que importan supabaseClient se mockean en cada test.
    restoreMocks: true,
  },
});
