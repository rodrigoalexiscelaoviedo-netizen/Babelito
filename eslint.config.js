import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "public", "supabase/functions/**", "scripts/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Deuda técnica conocida: setState dentro de efectos en 5 pantallas. Se corrige
      // migrando esas cargas a useSyncExternalStore/queries; aviso hasta entonces.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/__tests__/**/*.ts"],
    languageOptions: { globals: globals.node },
  }
);
