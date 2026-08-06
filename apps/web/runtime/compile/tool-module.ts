/**
 * Compile generated / fixture TypeScript tool modules to browser ESM via esbuild.
 *
 * resolveDir is pinned to apps/web via import.meta.url (not bare process.cwd())
 * so @repo/contracts resolves via the workspace symlink under any deploy cwd.
 */

import * as esbuild from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { allowlistToolSource, TOOL_SOURCE_MAX_CHARS } from "./allowlist";

/** Max compiled JS returned to client / postMessage. */
export const COMPILED_JS_MAX_CHARS = 500_000;

function looksLikeWebPackage(dir: string): boolean {
  try {
    const pkgPath = path.join(dir, "package.json");
    if (!existsSync(pkgPath)) return false;
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { name?: string };
    return pkg.name === "web";
  } catch {
    return false;
  }
}

/**
 * Absolute path to apps/web for esbuild resolveDir.
 * Prefer module-relative path when this file still lives under runtime/compile;
 * fall back to process.cwd() (pnpm/turbo / Next server typically cwd=apps/web).
 */
export function appsWebRoot(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const fromSource = path.resolve(here, "../..");
    if (looksLikeWebPackage(fromSource)) return fromSource;
  } catch {
    /* bundled route may not expose a stable source path */
  }
  const cwd = process.cwd();
  if (looksLikeWebPackage(cwd)) return cwd;
  return cwd;
}

export type CompileToolModuleResult =
  | { ok: true; js: string }
  | { ok: false; error: string; details?: string[] };

export async function compileToolModule(
  source: string,
): Promise<CompileToolModuleResult> {
  const allow = allowlistToolSource(source);
  if (!allow.ok) {
    return {
      ok: false,
      error: "Source failed allowlist checks",
      details: allow.errors,
    };
  }

  const resolveDir = appsWebRoot();

  try {
    const result = await esbuild.build({
      stdin: {
        contents: source,
        loader: "ts",
        resolveDir,
        sourcefile: "tool-module.ts",
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

export { TOOL_SOURCE_MAX_CHARS };
