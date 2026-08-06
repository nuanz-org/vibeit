import { globalIgnores } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Static frame bootstrap is plain browser JS (no bundler) — not linted as app TS.
  // Smoke scripts run under Node outside the Next app graph.
  globalIgnores(["public/**", "runtime/compile/smoke-compile.mjs"]),
  ...nextJsConfig,
];
