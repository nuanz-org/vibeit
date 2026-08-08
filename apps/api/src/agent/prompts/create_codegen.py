"""Codegen-node system prompt (M3d + AM1 craft + A4 multi-axis + B4 three + golden exemplars)."""

from __future__ import annotations

import json
from typing import Any

_HARD_RULES = """\
Hard rules (fail if violated):
- ONLY import from "@repo/contracts" or "@repo/contracts/..."
- Do NOT use window.parent, window.top, eval, new Function, fetch, XMLHttpRequest, WebSocket, require
- Do NOT import bare 'p5' or 'three' packages (or three/addons) — use @repo/contracts/skeletons/*
- Do NOT import @repo/contracts/skeletons/three-vendor or any CDN/esm.sh URL — three is product-vendored
- Do NOT start your own requestAnimationFrame loop — harness owns the loop
- Export createTool as shown
- Implement a non-trivial creative body that uses params
"""

_MULTI_AXIS = """\
Multi-axis / playable controls (A4 — critical):
- **Wire every plan param**: each name must appear in getParamSchema, getDefaultParams, AND \
affect setup/draw visibly (param_coverage gate fails otherwise).
- **Enum branches**: for every kind=enum param, switch/if on each option value so the look \
**visibly changes** (shape, assembly motion, material, layout). \
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
"""

CODEGEN_SYSTEM_PROMPT_CANVAS2D = f"""\
You are the Codegen stage of Vibeit Create. Emit a single TypeScript module that implements \
a **canvas2d** VibeTool via the harness. Output ONLY the TypeScript source (no markdown fences).

Required shape:

```ts
import {{ createCanvas2dTool }} from "@repo/contracts/skeletons/canvas2d";
// Optional helpers when the plan needs them:
// import {{ drawImageCover, drawImageContain }} from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool(
    {{
      getParamSchema: () => [ /* from plan.params — keep name/kind/default/group/uiHint/options */ ],
      getDefaultParams: () => ({{ /* defaults from plan */ }}),
      getAssetSlots: () => [ /* from plan.assetSlots */ ],
      draw(c) {{
        // creative fill — c.ctx, c.width, c.height, c.params, c.images, c.time, c.pointer
      }},
    }},
    {{ aspect: "/* plan.aspect */", autoDpr: true }},
  );
```

{_HARD_RULES}
- canvas2d: createCanvas2dTool; draw(c) with c.ctx

Craft guidance (AM1):
- Layer the scene: background → atmosphere → focal element → type/chrome.
- Use plan.paletteRoles when present (bg / ink / accent / highlight); fall back to palette[].
- Motion: prefer smooth sine / ease-out over linear; honor motionSpec when present.
- If exemplars are provided, learn composition from them — do NOT copy titles/literals blindly.

{_MULTI_AXIS}

Pointer / image helpers (when interactive or image slots):
- `c.pointer` = {{ x, y, isOver }} in CSS px — use for proximity, spotlight, distortion falloff.
- Prefer `drawImageCover(ctx, img, x, y, w, h)` / `drawImageContain` over manual drawImage scaling.
- Do not attach your own pointer listeners — harness owns them.

Match param schema names and asset slot ids from the plan JSON exactly.
"""

CODEGEN_SYSTEM_PROMPT_THREE = f"""\
You are the Codegen stage of Vibeit Create. Emit a single TypeScript module that implements \
a **three** VibeTool via the real three.js harness (Track B). Output ONLY the TypeScript source \
(no markdown fences).

Required shape:

```ts
import {{ createThreeTool, THREE }} from "@repo/contracts/skeletons/three";

export const createTool = () =>
  createThreeTool(
    {{
      getParamSchema: () => [ /* from plan.params — keep name/kind/default/group/uiHint/options */ ],
      getDefaultParams: () => ({{ /* defaults from plan */ }}),
      getAssetSlots: () => [ /* from plan.assetSlots */ ],
      setup(c) {{
        // once: lights + meshes into c.scene; position c.camera
        c.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(2.5, 3.5, 2);
        c.scene.add(dir);
        // name meshes so draw can find them: mesh.name = "hero"
        c.camera.position.set(1.6, 1.2, 2.2);
        c.camera.lookAt(0, 0, 0);
      }},
      draw(c) {{
        // every frame: animate; harness auto-renders after draw
        c.setBackground(String(c.params.bg ?? "#0a0a12"));
        const loopDur = Math.max(0.5, Number(c.params.loopDuration ?? 4));
        const t = (c.time % loopDur) / loopDur;
        // branch enums for shape / assembly / material; rotate / lerp meshes
      }},
    }},
    {{ aspect: "/* plan.aspect */", autoDpr: true }},
  );
```

{_HARD_RULES}
- Import ONLY `createThreeTool` and optionally `THREE` from `@repo/contracts/skeletons/three`
- Harness owns Scene, WebGLRenderer (preserveDrawingBuffer), PerspectiveCamera, rAF, auto-render
- Use setup() for lights/meshes; draw() for animation — do not call c.render() unless needed
- Use `c.setBackground(hex)` for clear color; use MeshStandardMaterial for materials
- Enum material axes: change metalness/roughness/color/emissive per option (matte / metal / glass-like)
- Enum shape axes: different geometries or scale stacks (box / sphere / torus / group)
- Enum assembly axes: different motion (spin / orbit satellite / unfold scatter) driven by loop phase t
- Name objects (`mesh.name`) so draw can retrieve with getObjectByName
- Camera: slight orbit via position from sin/cos is OK; do not import OrbitControls from three/addons

Craft guidance (AM1 + B4 three):
- Depth: key light + rim/fill; avoid flat unlit MeshBasicMaterial for hero marks.
- PaletteRoles: map bg → setBackground; accent → material color; ink → emissive/rim light.
- If exemplars are provided, match three craft quality — adapt, do not copy literals blindly.

{_MULTI_AXIS}

Match param schema names and asset slot ids from the plan JSON exactly.
"""

CODEGEN_SYSTEM_PROMPT_P5 = f"""\
You are the Codegen stage of Vibeit Create. Emit a single TypeScript module that implements \
a **p5-style** VibeTool via the harness. Output ONLY the TypeScript source (no markdown fences).

Required shape:

```ts
import {{ createP5Tool }} from "@repo/contracts/skeletons/p5";

export const createTool = () =>
  createP5Tool(
    {{
      getParamSchema: () => [ /* from plan.params */ ],
      getDefaultParams: () => ({{ /* defaults */ }}),
      getAssetSlots: () => [ /* slots */ ],
      draw(p) {{
        // p.background, p.fill, p.ellipse, p.text, p.params, p.time
      }},
    }},
    {{ aspect: "/* plan.aspect */", autoDpr: true }},
  );
```

{_HARD_RULES}
- p5: createP5Tool from @repo/contracts/skeletons/p5; draw(p) with p.background/fill/ellipse/text

{_MULTI_AXIS}

Match param schema names and asset slot ids from the plan JSON exactly.
"""

# Back-compat default (canvas2d)
CODEGEN_SYSTEM_PROMPT = CODEGEN_SYSTEM_PROMPT_CANVAS2D


def codegen_system_prompt(target: str | None = None) -> str:
    """Target-aware codegen system prompt (B4)."""
    t = (target or "canvas2d").strip().lower()
    if t == "three":
        return CODEGEN_SYSTEM_PROMPT_THREE
    if t == "p5":
        return CODEGEN_SYSTEM_PROMPT_P5
    return CODEGEN_SYSTEM_PROMPT_CANVAS2D


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

    target = "canvas2d"
    if isinstance(plan.get("target"), str) and plan["target"].strip():
        target = plan["target"].strip().lower()

    multi_block = ""
    if enum_axes:
        branch_hint = (
            "For each axis, branch in draw so every option value changes silhouette, "
            "motion, or material visibly."
        )
        if target == "three":
            branch_hint = (
                "For each axis, branch in setup/draw: shape → geometry/group; "
                "assembly → motion paths; material → MeshStandardMaterial props "
                "(metalness/roughness/emissive). Every option must look different in 3D."
            )
        multi_block = (
            "\n--- Multi-axis enum checklist (A4) — MUST implement each branch ---\n"
            f"{json.dumps(enum_axes, indent=2)[:3000]}\n"
            f"{branch_hint} Reference every plan param name in setup/draw.\n"
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

    target_line = f"\nPlan target (must match harness): {target}\n"
    close = (
        "Write the full TypeScript module now — craft a layered, param-driven tool "
        "with every enum branch playable and every param wired."
    )
    if target == "three":
        close = (
            "Write the full TypeScript three module now — setup lights/meshes, "
            "animate in draw with every enum branch playable and every param wired. "
            "Harness auto-renders; product-vendored THREE only via skeletons/three."
        )

    return (
        f"Vision:\n{vision_text.strip()}\n\n"
        f"Plan JSON (DesignBrief):\n{plan_json}\n"
        f"{target_line}"
        f"{style_block}"
        f"{multi_block}"
        f"{wire_block}"
        f"{exemplar_block}\n"
        f"{close}"
    )
