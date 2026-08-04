/**
 * Runtime frame entry (bundled → public/runtime-frame.js).
 *
 * Build: `pnpm --filter web build:runtime-frame`
 * Loaded by public/runtime-frame.html inside the sandboxed iframe.
 *
 * M2a4: hand-authored social-frame reference tool + canvas2d adapter.
 */

import { createSocialFrameTool } from "../fixtures/social-frame";
import { startCanvas2dFrameAdapter } from "../targets/canvas2d/adapter";

function ensureRoot(): HTMLElement {
  const existing = document.getElementById("root");
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = "root";
  root.setAttribute("data-vibeit-runtime-root", "");
  document.body.appendChild(root);
  return root;
}

const root = ensureRoot();

startCanvas2dFrameAdapter({
  root,
  createTool: createSocialFrameTool,
  parentOrigin: "*",
  target: "canvas2d",
});
