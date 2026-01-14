import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,

  globalIgnores([
    "*.config.js",
    "*.config.mjs",
    ".next/**",
    "node_modules/**",
  ]),
]);