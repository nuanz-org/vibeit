/**
 * Runtime frame entry (bundled → public/runtime-frame.js).
 *
 * Build: `pnpm --filter web build:runtime-frame` (ESM — required for import(blobUrl))
 * Loaded by public/runtime-frame.html as <script type="module">.
 *
 * B3: one adapter hosts canvas2d fixtures and moduleSource tools for any
 * target (canvas2d | p5 | three). Mount command carries the real target.
 */

import {
  SOCIAL_FRAME_TOOL_ID,
  createSocialFrameTool,
} from "../fixtures/social-frame";
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
  fixtureRegistry: {
    [SOCIAL_FRAME_TOOL_ID]: createSocialFrameTool,
  },
  defaultToolId: SOCIAL_FRAME_TOOL_ID,
  parentOrigin: "*",
  // Default READY = canvas2d fixture; mount may switch to p5/three
  target: "canvas2d",
});
