/**
 * Plain Node smoke for compileToolModule (no vitest).
 * Run from apps/web: node runtime/compile/smoke-compile.mjs
 * or: pnpm --filter web smoke:compile
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appsWebRoot = path.resolve(__dirname, "../..");

// Inline allowlist (mirror allowlist.ts) so smoke does not need TS loader
const FORBIDDEN = [
  { name: "npm_import", pattern: /from\s+['"](?!\.|@repo\/)[^'"]+['"]/ },
  { name: "eval", pattern: /\beval\s*\(/ },
];

function allowlist(source) {
  const errors = [];
  if (!source?.trim()) return { ok: false, errors: ["code is empty"] };
  for (const { name, pattern } of FORBIDDEN) {
    if (pattern.test(source)) errors.push(`forbidden pattern: ${name}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

async function compile(source) {
  const allow = allowlist(source);
  if (!allow.ok) return { ok: false, error: allow.errors.join("; ") };

  try {
    const result = await esbuild.build({
      stdin: {
        contents: source,
        loader: "ts",
        resolveDir: appsWebRoot,
        sourcefile: "smoke-tool.ts",
      },
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2020",
      legalComments: "none",
      logLevel: "silent",
    });
    const js = result.outputFiles?.[0]?.text ?? "";
    if (!js.trim()) return { ok: false, error: "empty output" };
    return { ok: true, js };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const MINIMAL = `
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        { name: "title", kind: "text", label: "Title", default: "Hi" },
      ],
      getDefaultParams: () => ({ title: "Hi" }),
      getAssetSlots: () => [],
      draw(c) {
        c.ctx.fillStyle = "#111";
        c.ctx.fillRect(0, 0, c.width, c.height);
        c.ctx.fillStyle = "#fff";
        c.ctx.fillText(String(c.params.title ?? ""), 20, 40);
      },
    },
    { aspect: "1:1", autoDpr: true },
  );
`;

let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

console.log("smoke-compile");

// 1. minimal valid
{
  const r = await compile(MINIMAL);
  assert("minimal compiles", r.ok, r.ok ? undefined : r.error);
  if (r.ok) {
    assert(
      "output mentions createTool or createCanvas2dTool",
      r.js.includes("createTool") || r.js.includes("createCanvas2dTool"),
    );
  }
}

// 2. empty
{
  const r = await compile("");
  assert("empty rejected", !r.ok, r.ok ? "should fail" : r.error);
}

// 3. free npm
{
  const r = await compile(`import _ from "lodash";\nexport const createTool = () => ({});\n`);
  assert("lodash import rejected", !r.ok, r.ok ? "should fail" : r.error);
}

// 4. social-frame fixture (no relative imports — stdin OK)
{
  const fixturePath = path.join(
    appsWebRoot,
    "runtime/fixtures/social-frame/tool.ts",
  );
  try {
    const source = readFileSync(fixturePath, "utf8");
    const r = await compile(source);
    assert("social-frame fixture compiles", r.ok, r.ok ? undefined : r.error);
  } catch (err) {
    assert("social-frame fixture compiles", false, String(err));
  }
}

if (failed > 0) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nall smoke checks passed");
