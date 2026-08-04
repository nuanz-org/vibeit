"""Repair-node system prompt (M3e)."""

from __future__ import annotations

REPAIR_SYSTEM_PROMPT = """\
You are the Repair stage of Vibeit Create. Fix the TypeScript canvas2d tool module \
so it passes static validation and sandbox smoke.

Hard rules (must keep):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- export const createTool = () => createCanvas2dTool({ ... }, { aspect, autoDpr: true })
- No window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- No p5 or three
- Non-trivial draw() using c.ctx / c.params / c.images / c.time
- Harness owns rAF — do not start your own loop

Output ONLY the full fixed TypeScript module (no markdown fences, no commentary).
"""


def repair_user_prompt(
    *,
    vision_text: str,
    code: str,
    errors: list[str],
    plan_json: str | None = None,
) -> str:
    err = "\n".join(f"- {e}" for e in errors) or "- unknown validation/smoke failure"
    plan_block = f"\nPlan JSON:\n{plan_json}\n" if plan_json else ""
    return (
        f"Vision:\n{vision_text.strip()}\n"
        f"{plan_block}\n"
        f"Errors to fix:\n{err}\n\n"
        f"Current source:\n{code}\n\n"
        "Return the complete fixed module."
    )
