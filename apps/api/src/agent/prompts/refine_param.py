"""AM7a — param-patch prompts (Control refine, no full codegen)."""

from __future__ import annotations

import json
from typing import Any

PARAM_PATCH_SYSTEM_PROMPT = """\
You are the Param-patch stage of Aiditr Control refine. The user wants a small \
control-surface change only — update existing parameter defaults, not structure.

Hard rules:
- ONLY change values of params that already exist in the schema / defaults.
- Do NOT invent new params, asset slots, or code.
- Do NOT rewrite the tool module.
- Prefer minimal numeric/color/text tweaks that match the chat request.
- If the request cannot be done with existing params alone, still return the \
best partial param updates (the runner may fall back to code patch elsewhere).

Output ONLY a JSON object (no markdown fences, no commentary):
{
  "updates": { "<paramName>": <newDefault>, ... },
  "rationale": "one short sentence"
}
"""


def param_patch_user_prompt(
    *,
    chat_message: str,
    default_params: dict[str, Any],
    param_schema: list[Any] | None = None,
    plan: dict[str, Any] | None = None,
) -> str:
    schema_json = json.dumps(param_schema if param_schema is not None else [], indent=2)
    defaults_json = json.dumps(default_params or {}, indent=2)
    plan_block = ""
    if isinstance(plan, dict):
        plan_block = f"\nPlan concept: {plan.get('concept') or ''}\n"
    return (
        f"User chat:\n{(chat_message or '').strip()}\n"
        f"{plan_block}\n"
        f"Current defaultParams:\n{defaults_json}\n\n"
        f"Param schema:\n{schema_json}\n\n"
        "Return JSON with updates for existing params only."
    )
