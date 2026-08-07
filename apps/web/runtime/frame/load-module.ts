/**
 * Frame-side loader for precompiled tool ESM (blob URL + dynamic import).
 * Requires runtime-frame.js built as --format=esm so import() stays native.
 */

import type { CreateVibeTool } from "@repo/contracts";

export type LoadedToolModule = {
  createTool: CreateVibeTool;
  /** Revoke when replacing or disposing the module. */
  revoke: () => void;
};

function isCreateVibeTool(value: unknown): value is CreateVibeTool {
  return typeof value === "function";
}

/**
 * Load a browser ESM module string that exports `createTool` (or default).
 */
export async function loadCreateToolFromModuleSource(
  moduleSource: string,
): Promise<LoadedToolModule> {
  const blob = new Blob([moduleSource], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  let revoked = false;
  const revoke = () => {
    if (revoked) return;
    revoked = true;
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  try {
    // Dynamic URL — must remain native import (ESM frame bundle only)
    const imported: unknown = await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      url
    );
    if (imported === null || typeof imported !== "object") {
      revoke();
      throw new Error("module import did not return an object");
    }
    const mod = imported as Record<string, unknown>;
    // Generated tools: createTool. Hand fixtures may export createSocialFrameTool.
    const factory: unknown =
      mod.createTool ?? mod.createSocialFrameTool ?? mod.default;
    if (!isCreateVibeTool(factory)) {
      revoke();
      throw new Error(
        "module has no createTool export (expected export const createTool, createSocialFrameTool, or default)",
      );
    }
    return { createTool: factory, revoke };
  } catch (err) {
    revoke();
    throw err;
  }
}
