/**
 * CLI compile gate for the API agent (AM2a).
 *
 * Same esbuild config as tool-module.ts / smoke-compile.mjs.
 * Usage (from apps/web or any cwd — resolveDir is fixed to apps/web):
 *   node runtime/compile/cli-compile.mjs < source.ts
 *   node runtime/compile/cli-compile.mjs --file path/to/tool.ts
 *
 * stdout: single JSON object
 *   { "ok": true, "js": "..." }
 *   { "ok": false, "error": "...", "details"?: string[] }
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appsWebRoot = path.resolve(__dirname, "../..");

// Raised in B2 for product-vendored three bundled into tool ESM
const COMPILED_JS_MAX_CHARS = 1_500_000;
const TOOL_SOURCE_MAX_CHARS = 400_000;

/** Mirror allowlist.ts / static_validate (fail closed before esbuild). */
const FORBIDDEN = [
  { name: "parent_window", pattern: /\bwindow\.parent\b/ },
  { name: "top_window", pattern: /\bwindow\.top\b/ },
  { name: "parent_bare", pattern: /(?<![\w.])parent\s*\./ },
  { name: "eval", pattern: /\beval\s*\(/ },
  { name: "function_ctor", pattern: /\bnew\s+Function\s*\(/ },
  { name: "document_write", pattern: /\bdocument\.write\s*\(/ },
  {
    name: "dynamic_script",
    pattern: /createElement\s*\(\s*['"]script['"]\s*\)/,
  },
  { name: "import_scripts", pattern: /\bimportScripts\s*\(/ },
  { name: "fetch_call", pattern: /\bfetch\s*\(/ },
  { name: "xml_http", pattern: /\bXMLHttpRequest\b/ },
  { name: "websocket", pattern: /\bWebSocket\b/ },
  { name: "require_call", pattern: /\brequire\s*\(/ },
  {
    name: "npm_import",
    pattern:
      /from\s+['"](?!\.|@repo\/)[^'"]+['"]|import\s*\(\s*['"](?!\.|@repo\/)[^'"]+['"]/,
  },
];

function allowlist(source) {
  const errors = [];
  if (!source?.trim()) return { ok: false, errors: ["code is empty"] };
  if (source.length > TOOL_SOURCE_MAX_CHARS) {
    errors.push(`code exceeds ${TOOL_SOURCE_MAX_CHARS} character limit`);
  }
  for (const { name, pattern } of FORBIDDEN) {
    if (pattern.test(source)) errors.push(`forbidden pattern: ${name}`);
  }
  if (
    /from\s+['"]p5(?:\/[^'"]*)?['"]|from\s+['"]three(?:\/[^'"]*)?['"]/.test(
      source,
    )
  ) {
    errors.push(
      "bare p5/three package imports not allowed — use @repo/contracts/skeletons/*",
    );
  }
  if (/@repo\/contracts\/skeletons\/three-vendor/.test(source)) {
    errors.push(
      "three-vendor is product-only — tool code must use @repo/contracts/skeletons/three (createThreeTool)",
    );
  }
  if (
    /from\s+['"]https?:\/\//.test(source) ||
    /import\s*\(\s*['"]https?:\/\//.test(source)
  ) {
    errors.push(
      "remote module URLs not allowed — three is product-vendored (no CDN/esm.sh)",
    );
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

async function compile(source) {
  const allow = allowlist(source);
  if (!allow.ok) {
    return {
      ok: false,
      error: "Source failed allowlist checks",
      details: allow.errors,
    };
  }

  try {
    const result = await esbuild.build({
      stdin: {
        contents: source,
        loader: "ts",
        resolveDir: appsWebRoot,
        sourcefile: "tool-module.ts",
      },
      bundle: true,
      minify: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2020",
      legalComments: "none",
      logLevel: "silent",
    });

    const js = result.outputFiles?.[0]?.text ?? "";
    if (!js.trim()) {
      return { ok: false, error: "esbuild produced empty output" };
    }
    if (js.length > COMPILED_JS_MAX_CHARS) {
      return {
        ok: false,
        error: `compiled JS exceeds ${COMPILED_JS_MAX_CHARS} character limit`,
      };
    }
    return { ok: true, js };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "esbuild compile failed";
    return { ok: false, error: message };
  }
}

function readSource() {
  const fileFlag = process.argv.indexOf("--file");
  if (fileFlag >= 0 && process.argv[fileFlag + 1]) {
    return readFileSync(process.argv[fileFlag + 1], "utf8");
  }
  return readFileSync(0, "utf8");
}

const source = readSource();
const result = await compile(source);
// Always exit 0 so Python can parse JSON; ok flag is in the payload.
process.stdout.write(JSON.stringify(result));
