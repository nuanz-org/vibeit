"""Repair-node system prompt (M3e + AM1 craft preservation + A4 multi-axis + B4 three)."""

from __future__ import annotations

import json
from typing import Any

REPAIR_SYSTEM_PROMPT_CANVAS2D = """\
You are the Repair stage of Vibeit Create. Fix the TypeScript canvas2d tool module \
so it passes static validation and real smoke gates (compile + host).

Hard rules (must keep):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- export const createTool = () => createCanvas2dTool({ ... }, { aspect, autoDpr: true })
- No window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- No p5 or three bare imports; no three-vendor; no CDN/esm.sh
- Non-trivial draw() using c.ctx / c.params / c.images / c.time (and c.pointer when relevant)
- Harness owns rAF — do not start your own loop
- TypeScript must esbuild-clean; runtime must not throw; canvas must not be blank
- Every plan param name must appear in getParamSchema / getDefaultParams / draw

Error prefixes you may see:
- static: / smoke: — contract / structural
- compile: — esbuild or allowlist failure (fix TS/syntax/import)
- param_coverage: — plan param never referenced in source (add schema key + draw use)
- host_smoke: — runtime throw, console error, blank canvas, captureFrame failure
- critique: — design-quality fix from the Critic (composition, motion, palette, type, params)

Craft preservation (AM1 + A4):
- Fix only what the errors list requires.
- Preserve composition layers, palette roles, easing/motion, and param surface.
- Do not collapse a designed scene into a pulsing-circle stub unless the whole draw is invalid.
- Keep param names, defaults, group, uiHint, and enum options aligned with the plan.
- **Multi-axis:** if plan has kind=enum params, keep a visible branch per option value; \
do not delete enum switches to "simplify".
- Loop tools: prefer normalized phase \
`t = (c.time % loopDuration) / loopDuration` (or plan's duration param).
- For blank-canvas errors: ensure draw paints visible pixels every frame.
- For param_coverage: reference each missing name as a string key in schema/defaults \
AND read it in draw so the control changes something visible.
- For critique: apply the ordered fix list; raise craft without breaking gates.

Output ONLY the full fixed TypeScript module (no markdown fences, no commentary).
"""

REPAIR_SYSTEM_PROMPT_THREE = """\
You are the Repair stage of Vibeit Create. Fix the TypeScript **three** tool module \
so it passes static validation and real smoke gates (compile + host).

Hard rules (must keep):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- Prefer: import { createThreeTool, THREE } from "@repo/contracts/skeletons/three"
- export const createTool = () => createThreeTool({ setup?, draw, ... }, { aspect, autoDpr: true })
- No window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- No bare 'three' / three/addons / three-vendor / CDN / esm.sh imports
- Harness owns Scene, WebGLRenderer, camera, rAF, auto-render — do not start your own loop
- setup() adds lights/meshes; draw() animates; use c.setBackground; MeshStandardMaterial preferred
- TypeScript must esbuild-clean; runtime must not throw; captureFrame must not be blank
- Every plan param name must appear in getParamSchema / getDefaultParams / setup|draw

Error prefixes: static / smoke / compile / param_coverage / host_smoke / critique (same meaning).

Craft preservation (AM1 + A4 + B4):
- Fix only listed errors; keep multi-axis enum branches (shape / assembly / material).
- Material enums → distinct metalness/roughness/emissive; shape enums → geometry/group; \
assembly → different motion paths.
- Name meshes for draw lookup; keep lights if present.
- For blank capture: ensure draw sets background + at least one lit mesh is visible.
- For param_coverage: reference each missing name in schema/defaults AND setup/draw.

Output ONLY the full fixed TypeScript module (no markdown fences, no commentary).
"""

REPAIR_SYSTEM_PROMPT_P5 = """\
You are the Repair stage of Vibeit Create. Fix the TypeScript p5-style tool module \
so it passes static validation and real smoke gates (compile + host).

Hard rules (must keep):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- export const createTool = () => createP5Tool({ ... }, { aspect, autoDpr: true })
- No bare p5/three imports; no CDN
- Non-trivial draw(p) using p.background / fill / ellipse / text / params / time
- Harness owns rAF; every plan param must be wired

Output ONLY the full fixed TypeScript module (no markdown fences, no commentary).
"""

# Back-compat
REPAIR_SYSTEM_PROMPT = REPAIR_SYSTEM_PROMPT_CANVAS2D


def repair_system_prompt(target: str | None = None) -> str:
    t = (target or "canvas2d").strip().lower()
    if t == "three":
        return REPAIR_SYSTEM_PROMPT_THREE
    if t == "p5":
        return REPAIR_SYSTEM_PROMPT_P5
    return REPAIR_SYSTEM_PROMPT_CANVAS2D


def repair_user_prompt(
    *,
    vision_text: str,
    code: str,
    errors: list[str],
    plan_json: str | None = None,
    plan: dict[str, Any] | None = None,
) -> str:
    err = "\n".join(f"- {e}" for e in errors) or "- unknown validation/smoke failure"
    plan_block = f"\nPlan JSON:\n{plan_json}\n" if plan_json else ""

    target = "canvas2d"
    if isinstance(plan, dict) and isinstance(plan.get("target"), str):
        target = plan["target"].strip().lower() or "canvas2d"

    enum_hint = ""
    if isinstance(plan, dict):
        params = plan.get("params") if isinstance(plan.get("params"), list) else []
        enums = []
        for p in params:
            if not isinstance(p, dict) or str(p.get("kind") or "") != "enum":
                continue
            name = p.get("name")
            opts = p.get("options") if isinstance(p.get("options"), list) else []
            values = [
                str(o.get("value"))
                for o in opts
                if isinstance(o, dict) and o.get("value") is not None
            ]
            if isinstance(name, str) and len(values) >= 2:
                enums.append(f"{name}=[{', '.join(values)}]")
        if enums:
            enum_hint = (
                "\nEnum axes to preserve (visible branch per value): "
                + "; ".join(enums)
                + "\n"
            )
        names = [
            str(p["name"])
            for p in params
            if isinstance(p, dict) and isinstance(p.get("name"), str)
        ]
        if names:
            enum_hint += (
                "Param names that must remain referenced: " + ", ".join(names) + "\n"
            )

    return (
        f"Vision:\n{vision_text.strip()}\n"
        f"Plan target: {target}\n"
        f"{plan_block}"
        f"{enum_hint}\n"
        f"Errors to fix:\n{err}\n\n"
        f"Broken module:\n```ts\n{code}\n```\n\n"
        "Return the full fixed TypeScript module only."
    )
