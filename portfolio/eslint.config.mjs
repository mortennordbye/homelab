import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Pin the version eslint-plugin-react asks for. eslint-config-next sets
    // "detect", whose lookup calls context.getFilename(), removed in ESLint 10.
    settings: {
      react: {
        version: "19.2",
      },
    },
  },
]);

export default eslintConfig;
