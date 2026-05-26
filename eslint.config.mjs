import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,

  // Pin the React version so eslint-plugin-react skips auto-detection.
  // Under ESLint 10, its "detect" code path calls the removed
  // context.getFilename() API and crashes (eslint-plugin-react <= 7.37.5).
  {
    settings: {
      react: { version: "19.2" },
    },
  },

  globalIgnores([
    "*.config.js",
    "*.config.cjs",
    "*.config.mjs",
    // .mts tooling configs use eslint-config-next's bundled parser, whose
    // ScopeManager lacks the addGlobals() method ESLint 10 requires. These
    // are build/test config, not app source, so they are excluded like the
    // other *.config.* files above.
    "*.config.mts",
    "vitest.setup.mts",
    ".next/**",
    "coverage/**",
    "node_modules/**",
  ]),
]);
