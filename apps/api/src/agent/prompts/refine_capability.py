"""Prompts for Studio capability agent (Brik-class controller edits)."""

from __future__ import annotations

import json
from typing import Any

CAPABILITY_SYSTEM_PROMPT = """\
You are the Studio control agent for Aiditr (same product pattern as Brik tool chat).

The user is iterating on an EXISTING interactive design tool. Controllers in \
paramSchema are the product surface — like Brik's set_controls_schema.

Emit ONLY a JSON object (no markdown fences):
{
  "ops": [ ... ],
  "explain": "short user-facing message"
}

## Ops

1) update_param_meta — change an EXISTING controller's range/label (PREFERRED for \
"more", "even more", "up to N", "max", "range", "limit", "allow higher")
   { "op": "update_param_meta", "name": "galleryArc", "max": 3000, "min": -1000 }
   Fields you may set: min, max, step, label, default, group

2) update_param_value — set the live slider value (draft) ONLY if the user asked \
for a specific number OR after max is high enough
   { "op": "update_param_value", "name": "galleryArc", "value": 3000 }

3) patch_code — structural/motion/draw rewrite only when controllers cannot satisfy \
the request (new layers, new behavior, new params)
   { "op": "patch_code", "instruction": "..." }

## Brik-style rules (must follow)

- Match param names from paramNames / paramSchema only (e.g. galleryArc, itemSpacing).
- "I want more X than 600" / "even more" / "increase the range" → \
update_param_meta to RAISE max (pick a generous ceiling, often 3–5× current max \
or the number they mentioned). Do NOT only change the default value.
- Prefer schema/range edits over rewriting the whole tool.
- Do NOT invent new params or remove existing ones unless explicitly asked.
- If they only want a wider range, expand min/max and leave value to the user \
(do not force a new value unless they asked for one).
- If they want a concrete value above current max: meta max first, then value.
- Use patch_code only for real structural creative changes.
- explain should sound like Brik, e.g. \
"I've expanded the **Gallery Arc** control limit so you can push the curve up to 3000…" \
and tell them which panel/control to adjust. Never say only "Refine applied".
- If nothing can be done: {"ops": [], "explain": "why"}.
"""


def capability_user_prompt(*, context_pack: dict[str, Any]) -> str:
    pack = dict(context_pack)
    code = pack.get("code") or ""

    # Highlight number controllers for range decisions
    schema = pack.get("paramSchema") or []
    range_summary: list[dict[str, Any]] = []
    effective = pack.get("effectiveParams") if isinstance(pack.get("effectiveParams"), dict) else {}
    if isinstance(schema, list):
        for p in schema:
            if not isinstance(p, dict) or p.get("name") is None:
                continue
            # Prefer numeric / ranged controllers for the Brik range path
            if p.get("kind") not in (None, "number") and p.get("min") is None and p.get("max") is None:
                continue
            range_summary.append(
                {
                    "name": p.get("name"),
                    "label": p.get("label") or p.get("name"),
                    "min": p.get("min"),
                    "max": p.get("max"),
                    "default": p.get("default"),
                    "current": effective.get(p.get("name")),
                    "group": p.get("group"),
                }
            )

    slim = {
        "userMessage": pack.get("userMessage"),
        "chatHistory": pack.get("chatHistory") or [],
        "controllers": range_summary,
        "paramSchema": pack.get("paramSchema") or [],
        "paramNames": pack.get("paramNames") or [],
        "defaultParams": pack.get("defaultParams") or {},
        "draftParams": pack.get("draftParams") or {},
        "effectiveParams": pack.get("effectiveParams") or {},
        "codeDigest": pack.get("codeDigest") or {},
        "target": pack.get("target"),
        "productHint": (
            "If the user wants more range on a slider (more than current max / "
            "even more arc/spacing), emit update_param_meta with a higher max "
            "(e.g. 3000) like Brik set_controls_schema — not a full rewrite."
        ),
    }
    if isinstance(code, str) and 0 < len(code) <= 36_000:
        slim["code"] = code
    elif isinstance(code, str) and len(code) > 36_000:
        slim["codePreview"] = code[:12_000] + "\n/* truncated */"

    return (
        "Context pack (JSON):\n"
        f"{json.dumps(slim, indent=2, default=str)}\n\n"
        "Return JSON with ops + explain only. Prefer controller range edits."
    )
