"""Codegen-node system prompt (M3d + AM1 craft + A4 multi-axis + golden exemplars)."""

from __future__ import annotations

import json
from typing import Any

CODEGEN_SYSTEM_PROMPT = """\
You are the Codegen stage of Vibeit Create. Emit a single TypeScript module that implements \
a canvas2d VibeTool via the harness. Output ONLY the TypeScript source (no markdown fences).

Required shape:

```ts
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";
// Optional helpers when the plan needs them:
// import { drawImageCover, drawImageContain } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [ /* from plan.params — keep name/kind/default/group/uiHint/options */ ],
      getDefaultParams: () => ({ /* defaults from plan */ }),
      getAssetSlots: () => [ /* from plan.assetSlots */ ],
      draw(c) {
        // creative fill — c.ctx, c.width, c.height, c.params, c.images, c.time, c.pointer
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
- Implement a non-trivial draw body that uses params

Target harness (match plan.target):
- canvas2d (default): createCanvas2dTool from @repo/contracts/skeletons/canvas2d; draw(c) with c.ctx
- p5: createP5Tool from @repo/contracts/skeletons/p5; draw(p) with p.background/fill/ellipse/text
- three: createThreeTool from @repo/contracts/skeletons/three; draw(c) with c.gl / c.clear (WebGL)

Craft guidance (AM1):
- Layer the scene: background → atmosphere → focal element → type/chrome.
- Use plan.paletteRoles when present (bg / ink / accent / highlight); fall back to palette[].
- Motion: prefer smooth sine / ease-out over linear; honor motionSpec when present.
- If exemplars are provided, learn composition from them — do NOT copy titles/literals blindly.

Multi-axis / playable controls (A4 — critical):
- **Wire every plan param**: each name must appear in getParamSchema, getDefaultParams, AND \
affect draw visibly (param_coverage gate fails otherwise).
- **Enum branches**: for every kind=enum param, switch/if on each option value so the look \
**visibly changes** (shape silhouette, assembly motion, material fill/stroke, layout). \
Do not ignore options or hardcode one variant.
- Keep group / uiHint / options from the plan on schema fields when present.
- Prefer reading params once at the top of draw: `const p = c.params as Record<string, unknown>` \
or typed destructuring — then use those bindings throughout.

Loop timing pattern (when motion is looping / kinetic):
```ts
const loopDur = Math.max(0.5, Number(c.params.loopDuration ?? 4));
const t = (c.time % loopDur) / loopDur; // 0..1 seamless loop phase
// ease e.g. const e = t * t * (3 - 2 * t); // smoothstep
```
- If plan has loopDuration (or similar), use it. If not but motion loops, still normalize time.

Pointer / image helpers (canvas2d, when plan is interactive or has image slots):
- `c.pointer` = { x, y, isOver } in CSS px — use for proximity, spotlight, distortion falloff.
- Prefer `drawImageCover(ctx, img, x, y, w, h)` / `drawImageContain` over manual drawImage scaling.
- Do not attach your own pointer listeners — harness owns them.

Match param schema names and asset slot ids from the plan JSON exactly.
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


def _enum_axes_from_plan(plan: dict[str, Any]) -> list[dict[str, Any]]:
    params = plan.get("params")
    if not isinstance(params, list):
        return []
    axes: list[dict[str, Any]] = []
    for p in params:
        if not isinstance(p, dict):
            continue
        if str(p.get("kind") or "") != "enum":
            continue
        name = p.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        opts = p.get("options") if isinstance(p.get("options"), list) else []
        values = []
        for o in opts:
            if isinstance(o, dict) and o.get("value") is not None:
                values.append(str(o["value"]))
            elif isinstance(o, str):
                values.append(o)
        if len(values) >= 2:
            axes.append(
                {
                    "name": name.strip(),
                    "options": values,
                    "default": p.get("default"),
                    "group": p.get("group"),
                }
            )
    return axes


def codegen_user_prompt(
    *,
    vision_text: str,
    plan: dict[str, Any],
    exemplars: list[dict[str, Any]] | None = None,
    style_notes: dict[str, Any] | None = None,
    clarify_result: dict[str, Any] | None = None,
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

    enum_axes = _enum_axes_from_plan(plan)
    if isinstance(clarify_result, dict):
        forced = clarify_result.get("forcedEnums")
        if isinstance(forced, list):
            for fe in forced:
                if not isinstance(fe, dict):
                    continue
                name = fe.get("name")
                if not isinstance(name, str) or not name.strip():
                    continue
                if any(a["name"] == name.strip() for a in enum_axes):
                    continue
                opts = fe.get("options") if isinstance(fe.get("options"), list) else []
                values = []
                for o in opts:
                    if isinstance(o, dict) and o.get("value") is not None:
                        values.append(str(o["value"]))
                if len(values) >= 2:
                    enum_axes.append(
                        {
                            "name": name.strip(),
                            "options": values,
                            "default": fe.get("default"),
                            "group": fe.get("group"),
                        }
                    )

    multi_block = ""
    if enum_axes:
        multi_block = (
            "\n--- Multi-axis enum checklist (A4) — MUST implement each branch ---\n"
            f"{json.dumps(enum_axes, indent=2)[:3000]}\n"
            "For each axis, branch in draw so every option value changes silhouette, "
            "motion, or material visibly. Reference every plan param name in draw.\n"
            "---\n"
        )
    elif isinstance(clarify_result, dict) and clarify_result.get("transcript"):
        multi_block = (
            "\nClarify transcript (honor locked choices in composition):\n"
            f"{str(clarify_result.get('transcript'))[:2000]}\n"
        )

    param_names: list[str] = []
    params = plan.get("params") if isinstance(plan.get("params"), list) else []
    for p in params:
        if isinstance(p, dict) and isinstance(p.get("name"), str):
            param_names.append(p["name"])
    wire_block = ""
    if param_names:
        wire_block = (
            f"\nParam names that must appear in schema + defaults + draw: "
            f"{', '.join(param_names)}\n"
        )

    return (
        f"Vision:\n{vision_text.strip()}\n\n"
        f"Plan JSON (DesignBrief):\n{plan_json}\n"
        f"{style_block}"
        f"{multi_block}"
        f"{wire_block}"
        f"{exemplar_block}\n"
        "Write the full TypeScript module now — craft a layered, param-driven tool "
        "with every enum branch playable and every param wired."
    )
