/**
 * Defense-in-depth allowlist for tool source before esbuild
 * (mirrors API agent/validators/static_validate.py forbidden patterns).
 */

export const TOOL_SOURCE_MAX_CHARS = 400_000;

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
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
    // Allow @repo/* and relative ./ ../ only
    pattern:
      /from\s+['"](?!\.|@repo\/)[^'"]+['"]|import\s*\(\s*['"](?!\.|@repo\/)[^'"]+['"]/,
  },
];

export type AllowlistResult = { ok: true } | { ok: false; errors: string[] };

export function allowlistToolSource(source: string): AllowlistResult {
  const errors: string[] = [];
  const text = source ?? "";

  if (!text.trim()) {
    return { ok: false, errors: ["code is empty"] };
  }
  if (text.length > TOOL_SOURCE_MAX_CHARS) {
    errors.push(`code exceeds ${TOOL_SOURCE_MAX_CHARS} character limit`);
  }

  for (const { name, pattern } of FORBIDDEN) {
    if (pattern.test(text)) {
      errors.push(`forbidden pattern: ${name}`);
    }
  }

  if (/from\s+['"]p5['"]|from\s+['"]three['"]/.test(text)) {
    errors.push("p5/three imports not allowed on ASAP canvas2d path");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
