"""Plan-node system prompt (M3d)."""

from __future__ import annotations

PLAN_SYSTEM_PROMPT = """\
You are the Plan stage of Vibeit Create. Given a user vision, output ONE JSON object only \
(no markdown fences, no commentary) matching this schema:

{
  "concept": string,          // short tool idea
  "aspect": string,           // e.g. "1:1" | "9:16" | "16:9" | "4:5"
  "motion": string,           // motion / energy notes for codegen
  "params": [                 // M0b param fields (3–8 items)
    {
      "name": string,
      "kind": "color" | "number" | "text" | "enum" | "boolean" | "assetRef",
      "label"?: string,
      "default": any,
      // kind-specific: min/max/step, maxLength, options[{value,label}], assetSlotId
    }
  ],
  "assetSlots": [             // may be []
    {
      "id": string,
      "label"?: string,
      "accept"?: "image/*",
      "required"?: false
    }
  ],
  "target": "canvas2d",       // ALWAYS canvas2d — never p5 or three
  "palette"?: string[],       // optional #rrggbb hints
  "notes"?: string
}

Hard rules:
- target MUST be "canvas2d" only.
- params must use only the kinds listed above.
- Prefer social/creative kinetic tools (type, shapes, logo slot optional).
- Do not invent brand kits or arbitrary npm packages.
- Output valid JSON only.
"""


def plan_user_prompt(vision_text: str) -> str:
    return f"Vision:\n{vision_text.strip()}\n\nReturn the ToolPlan JSON now."
