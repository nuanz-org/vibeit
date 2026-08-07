"""Critic / judge prompts (AM3)."""

from __future__ import annotations

import json
from typing import Any

CRITIQUE_SYSTEM_PROMPT = """\
You are the Critic stage of Vibeit Create. You judge whether a generated \
canvas2d tool looks art-directed (brik.space bar), not merely "valid code".

Score against the DesignBrief / plan and vision — not generic taste alone.

Axes (each integer-ish 1–5, decimals ok):
- composition: layered scene, focal point, hierarchy, not a single centered stub
- motion: intentional easing/tempo/loop feel described in plan (still ok if plan is still)
- palette: roles respected (bg/ink/accent), contrast, discipline
- typography: hierarchy, legibility, intentional scale (N/A stills with no type → 3)
- params: controls actually drive visible behavior; names match the brief

overall = mean of axes (you may adjust slightly if one axis dominates).

fixes: ordered, concrete code-level changes (max 6). Empty if overall ≥ 3.5.

Reply with ONLY a JSON object (no markdown fences):
{
  "overall": 3.2,
  "scores": {
    "composition": 3,
    "motion": 4,
    "palette": 3,
    "typography": 2,
    "params": 4
  },
  "summary": "one or two sentences",
  "fixes": [
    "Add a secondary layer (baseline / caption) under the hero type",
    "Drive title color from params.ink, not a hard-coded white"
  ]
}
"""


def critique_user_prompt(
    *,
    vision_text: str,
    plan: dict[str, Any] | None,
    code: str,
    smoke_variance: float | None = None,
    screenshot_path: str | None = None,
) -> str:
    plan_json = (
        json.dumps(plan, indent=2)[:6000]
        if isinstance(plan, dict)
        else "(no plan)"
    )
    # Truncate source for judge context
    src = code or ""
    if len(src) > 12_000:
        src = src[:12_000] + "\n/* …truncated… */"

    smoke_bits = []
    if smoke_variance is not None:
        smoke_bits.append(f"host_smoke luminance variance: {smoke_variance:.2f}")
    if screenshot_path:
        smoke_bits.append(f"screenshot path: {screenshot_path}")
    smoke_block = (
        "\n".join(smoke_bits) if smoke_bits else "no smoke metrics available"
    )

    return (
        f"Vision:\n{(vision_text or '').strip()}\n\n"
        f"DesignBrief / plan JSON:\n{plan_json}\n\n"
        f"Smoke / capture notes:\n{smoke_block}\n\n"
        f"Tool TypeScript source:\n{src}\n\n"
        "Score this tool against the brief. Return Critique JSON only."
    )
