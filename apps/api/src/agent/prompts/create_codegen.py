"""Codegen-node system prompt (M3d) — canvas2d harness creative fill only."""

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
- Do NOT import p5 or three
- Do NOT start your own requestAnimationFrame loop — harness owns the loop
- Draw using harness-loaded c.images[slotId] for assets (crossOrigin already set)
- Export createTool (or createSocialFrameTool) as shown
- Implement a non-trivial draw body that uses params (colors, title, motion)

Match param schema names and asset slot ids from the plan JSON.
"""


def codegen_user_prompt(*, vision_text: str, plan: dict[str, Any]) -> str:
    plan_json = json.dumps(plan, indent=2)
    return (
        f"Vision:\n{vision_text.strip()}\n\n"
        f"Plan JSON:\n{plan_json}\n\n"
        "Write the full TypeScript module now."
    )
