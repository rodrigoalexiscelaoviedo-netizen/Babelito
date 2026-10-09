import { defineConfig, devices } from "@playwright/test";

// Smoke de idioma: requiere una cuenta de prueba con learning_language='ca'.
//   E2E_EMAIL, E2E_PASSWORD, E2E_BASE_URL (por defecto http://localhost:5173)
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
});
