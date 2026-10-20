import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Los módulos que importan supabaseClient se mockean en cada test.
    restoreMocks: true,
  },
});
