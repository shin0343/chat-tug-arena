import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";
export default defineConfig([
  ...nextVitals,
  ...tseslint.configs.recommended,
  { settings: { next: { rootDir: "apps/web/" } } },
  {
    files: ["**/*.{js,mjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/node_modules/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
  ]),
]);
