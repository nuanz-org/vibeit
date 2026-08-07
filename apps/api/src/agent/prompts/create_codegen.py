"""Codegen-node system prompt (M3d + AM1 craft + golden exemplars)."""

from __future__ import annotations

import json
from typing import Any

CODEGEN_SYSTEM_PROMPT = """\
You are the Codegen stage of Vibeit Create. Emit a single TypeScript module that implements \
a canvas2d VibeTool via the harness. Output ONLY the TypeScript source (no markdown fences).

Required shape:

```ts
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [ /* from plan.params */ ],
      getDefaultParams: () => ({ /* defaults from plan */ }),
      getAssetSlots: () => [ /* from plan.assetSlots */ ],
      draw(c) {
        // creative fill only — use c.ctx, c.width, c.height, c.params, c.images, c.time
      },
    },
    { aspect: "/* plan.aspect */", autoDpr: true },
  );
```

Hard rules (fail if violated):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- Do NOT use window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- Do NOT import bare 'p5' or 'three' packages — use @repo/contracts/skeletons/*
- Do NOT start your own requestAnimationFrame loop — harness owns the loop
- Export createTool as shown
- Implement a non-trivial draw body that uses params (colors, title, motion)

Target harness (match plan.target):
- canvas2d (default): createCanvas2dTool from @repo/contracts/skeletons/canvas2d; draw(c) with c.ctx
- p5: createP5Tool from @repo/contracts/skeletons/p5; draw(p) with p.background/fill/ellipse/text
- three: createThreeTool from @repo/contracts/skeletons/three; draw(c) with c.gl / c.clear (WebGL)

Craft guidance (AM1 — match brik-level intent):
- Layer the scene: background → atmosphere → focal element → type/chrome.
- Use plan.paletteRoles when present (bg / ink / accent / highlight); fall back to palette[].
- Motion: prefer smooth sine / ease-out over linear; honor motionSpec when present.
- Params drive look: every plan param name should affect draw.
- If exemplars are provided, learn composition from them — do NOT copy titles/literals blindly.

Match param schema names and asset slot ids from the plan JSON.
"""


def _format_exemplars(exemplars: list[dict[str, Any]] | None) -> str:
    if not exemplars:
        return ""
    blocks: list[str] = []
    for i, ex in enumerate(exemplars, start=1):
        gid = ex.get("id") or f"golden-{i}"
        desc = ex.get("description") or ""
        source = (ex.get("source") or "").strip()
        if not source:
            continue
        blocks.append(
            f"### Exemplar {i}: {gid}\n"
            f"{desc}\n\n"
            f"```ts\n{source}\n```"
        )
    if not blocks:
        return ""
    return (
        "\n\nGolden exemplars (hand-authored craft references — match quality, adapt to the plan):\n\n"
        + "\n\n".join(blocks)
        + "\n"
    )


def codegen_user_prompt(
    *,
    vision_text: str,
    plan: dict[str, Any],
    exemplars: list[dict[str, Any]] | None = None,
    style_notes: dict[str, Any] | None = None,
) -> str:
    plan_json = json.dumps(plan, indent=2)
    exemplar_block = _format_exemplars(exemplars)
    style_block = ""
    if isinstance(style_notes, dict) and style_notes:
        style_block = (
            "\nStyle notes (interpret only — echo palette/mood/motion feel, "
            "never recreate reference pixels or logos):\n"
            f"{json.dumps(style_notes, indent=2)[:3000]}\n"
        )
    return (
        f"Vision:\n{vision_text.strip()}\n\n"
        f"Plan JSON (DesignBrief):\n{plan_json}\n"
        f"{style_block}"
        f"{exemplar_block}\n"
        "Write the full TypeScript module now — craft a layered, param-driven canvas2d tool."
    )
