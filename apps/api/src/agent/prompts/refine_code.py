"""AM7a — code-patch prompts (Control refine minimal module edit)."""

from __future__ import annotations

import json
from typing import Any

from agent.prompts.perf_craft import PERF_CRAFT_CANVAS2D, PERF_CRAFT_REFINE

CODE_PATCH_SYSTEM_PROMPT = f"""\
You are the Code-patch stage of Aiditr Control refine. Apply the user's chat \
request as a MINIMAL change to the existing TypeScript canvas2d tool module.

Hard rules (must keep):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- export const createTool = () => createCanvas2dTool({{ ... }}, {{ aspect, autoDpr: true }})
- No window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- No p5 or three unless the base module already uses them (canvas2d is default)
- Non-trivial draw() using c.ctx / c.params / c.images / c.time
- Harness owns rAF — do not start your own loop
- TypeScript must esbuild-clean; runtime must not throw; canvas must not be blank
- Every schema param name must appear in getParamSchema / getDefaultParams / draw

Patch discipline:
- Change only what the chat asks for (structure, motion, new params, labels).
- Preserve composition, palette roles, easing, and unrelated params.
- Prefer adding a param + wiring it in draw over rewriting the whole scene.
- Hard full regen only when the request is structural (new layers, subtitle, layout).
- Keep aspect and target consistent with the base module.

{PERF_CRAFT_CANVAS2D}
{PERF_CRAFT_REFINE}

Output ONLY the full fixed TypeScript module (no markdown fences, no commentary).
"""


def code_patch_user_prompt(
    *,
    chat_message: str,
    code: str,
    plan: dict[str, Any] | None = None,
    default_params: dict[str, Any] | None = None,
) -> str:
    plan_block = ""
    if isinstance(plan, dict):
        plan_block = f"\nPlan JSON:\n{json.dumps(plan, indent=2)}\n"
    defaults_block = ""
    if isinstance(default_params, dict) and default_params:
        defaults_block = (
            f"\nCurrent defaultParams (preserve unless chat changes them):\n"
            f"{json.dumps(default_params, indent=2)}\n"
        )
    return (
        f"User chat (apply as minimal patch):\n{(chat_message or '').strip()}\n"
        f"{plan_block}{defaults_block}\n"
        f"Current source:\n{code}\n\n"
        "Return the complete patched module. Minimal diff in spirit; full file in form."
    )
