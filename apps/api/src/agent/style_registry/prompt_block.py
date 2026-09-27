"""Prompt text for the style registry: plan shortlist, STYLE LOCK, clarify question."""

from __future__ import annotations

from typing import Any

from agent.style_registry.registry import (
    active_styles,
    font_stack,
    get_style,
    load_registry,
    lock_policy,
)
from agent.style_registry.select import StyleChoice

STYLE_QUESTION_ID = "visualStyle"


def _control_line(ctrl: dict[str, Any]) -> str:
    kind = ctrl.get("kind")
    bits = [f"{ctrl['name']} ({kind}"]
    if kind == "number":
        bits.append(f" {ctrl.get('min')}–{ctrl.get('max')}")
    bits.append(f", default {ctrl.get('default')!r})")
    label = ctrl.get("label")
    return "".join(bits) + (f" — {label}" if label else "")


def _lint_lines(entry: dict[str, Any]) -> list[str]:
    rules = load_registry().get("lintRules") or {}
    lint = entry.get("lint") or {}
    lines: list[str] = []
    for key in ("forbid", "require"):
        for rule_id in lint.get(key) or []:
            rule = rules.get(rule_id) or {}
            msg = str(rule.get("message") or rule_id).replace("{name}", str(entry["name"]))
            lines.append(f"- {msg}")
    return lines


def _fonts_line(spec: dict[str, Any]) -> str:
    keys = (spec.get("typography") or {}).get("fonts") or []
    stacks = [f"{k}: {font_stack(k)}" for k in keys]
    return "; ".join(stacks)


def plan_style_block(choice: StyleChoice) -> str:
    """Style section of the plan user prompt."""
    lines: list[str] = []
    if choice.locked_id:
        look = get_style(choice.locked_id) or {}
        spec = look.get("spec") or {}
        lines += [
            f"--- VISUAL STYLE — LOCKED: {look.get('name')} ({look.get('id')}) — {choice.reason} ---",
            f"Set \"styleId\": \"{look.get('id')}\". Do not pick another style.",
            f"Essence: {spec.get('essence')}",
            f"Palette rule: {(spec.get('palette') or {}).get('rule')}",
            f"Typography: {(spec.get('typography') or {}).get('rule')}",
            f"Composition: {(spec.get('composition') or {}).get('rule')}",
            f"Motion: {(spec.get('motion') or {}).get('rule')}",
        ]
        styles = [look]
    else:
        lines += [
            "--- VISUAL STYLE — choose exactly ONE styleId from this shortlist ---",
            "Pick the look that best fits the subject, audience and mood. Set \"styleId\" and a one-line \"styleRationale\".",
        ]
        styles = [s for s in (get_style(i) for i in choice.shortlist) if s]
        for s in styles:
            spec = s.get("spec") or {}
            suits = s.get("suits") or {}
            lines += [
                f"* {s['id']} — {s['name']}: {s['summary']}",
                f"  suits: {', '.join(list(suits.get('moods') or [])[:6])} | {', '.join(list(suits.get('subjects') or [])[:8])}",
                f"  palette: {(spec.get('palette') or {}).get('rule')}",
                f"  motion: {(spec.get('motion') or {}).get('rule')}",
            ]

    lines += ["", "Style controls are added to params automatically — do NOT add duplicates of them:"]
    for s in styles:
        names = ", ".join(str(c["name"]) for c in s.get("controls") or [])
        lines.append(f"  {s['id']}: {names}")
    lines += [
        "You may adapt the style's colour controls to the subject with \"styleColors\": {controlName: \"#rrggbb\"} — stay inside the palette rule.",
        "Plan concept, composition, paletteRoles, typography and motionSpec INSIDE the chosen style. Do not add effects the style forbids.",
    ]

    type_entries = active_styles("type")
    if choice.type_locked_id:
        t = get_style(choice.type_locked_id) or {}
        lines += ["", f"Type treatment LOCKED: set \"typeTreatmentId\": \"{t.get('id')}\" ({t.get('summary')})."]
    elif type_entries:
        lines += ["", "Optional \"typeTreatmentId\" (only when the headline itself is the hero; else null):"]
        for t in type_entries:
            lines.append(f"* {t['id']} — {t['summary']}")
    lines.append("---")
    return "\n".join(lines)


def style_lock_block(
    look: dict[str, Any] | None,
    typ: dict[str, Any] | None = None,
    *,
    compact: bool = False,
) -> str:
    """STYLE LOCK text for codegen (full) or repair / critique / refine (compact)."""
    if not look:
        return ""
    spec = look.get("spec") or {}
    palette = spec.get("palette") or {}
    typo = spec.get("typography") or {}
    comp = spec.get("composition") or {}
    motion = spec.get("motion") or {}
    policy = lock_policy()

    lines = [
        f"=== STYLE LOCK: {look['name']} ({look['id']}) ===",
        f"Essence: {spec.get('essence')}",
        f"Palette rule: {palette.get('rule')}",
    ]
    if not compact:
        defaults = ", ".join(f"{k} {v}" for k, v in (palette.get("defaults") or {}).items())
        lines += [
            f"Default colours: {defaults}",
            f"Typography: {typo.get('rule')}",
            f"Font stacks (only these, system fonts only — no web fonts load): {_fonts_line(spec)}",
            f"Composition: {comp.get('rule')}",
            f"Texture: {spec.get('texture')}",
            f"Lighting: {spec.get('lighting')}",
            f"Motion: {motion.get('rule')}"
            + (f" (target ~{motion['fps']} fps stepping)" if motion.get("fps") else ""),
            "Recipe (implement these steps):",
        ]
        lines += [f"  {i}. {step}" for i, step in enumerate(spec.get("recipe") or [], start=1)]
    else:
        lines += [
            f"Typography: {typo.get('rule')} Fonts: {_fonts_line(spec)}",
            f"Motion: {motion.get('rule')}",
        ]
    lines += ["MUST:"] + [f"  - {m}" for m in spec.get("must") or []]
    lines += ["NEVER:"] + [f"  - {n}" for n in spec.get("never") or []]

    controls = list(look.get("controls") or [])
    if typ:
        controls += list(typ.get("controls") or [])
    if controls:
        lines.append("Style controls (already in the plan params — read each one in draw so it visibly changes the look):")
        lines += [f"  - {_control_line(c)}" for c in controls]

    lint = _lint_lines(look)
    if lint:
        lines.append("Automatic checks reject code that breaks these:")
        lines += [f"  {line}" for line in lint]

    if typ:
        tspec = typ.get("spec") or {}
        lines += [
            f"Type treatment: {typ['name']} ({typ['id']}) — {tspec.get('rule')}",
            "Type MUST: " + "; ".join(tspec.get("must") or []),
            "Type NEVER: " + "; ".join(tspec.get("never") or []),
        ]

    if not compact:
        adaptable = list(policy["adaptable"])
        if palette.get("adaptable"):
            adaptable.append(f"Colours: {palette['adaptable']}")
        if comp.get("adaptable"):
            adaptable.append(f"Composition: {comp['adaptable']}")
        lines += ["LOCKED — do not change:"] + [f"  - {x}" for x in policy["locked"]]
        lines += ["YOU MAY ADAPT (this is where your craft goes):"] + [f"  - {x}" for x in adaptable]
        lines.append(
            "This STYLE LOCK overrides golden exemplars, generic craft guidance and your own taste."
        )
    lines.append("=== end STYLE LOCK ===")
    return "\n".join(lines)


def style_question(shortlist: tuple[str, ...] | list[str], *, limit: int = 4) -> dict[str, Any] | None:
    """Clarify question offering the top styles (values are style ids)."""
    options = []
    for sid in list(shortlist)[:limit]:
        s = get_style(sid)
        if s is None:
            continue
        options.append({"value": s["id"], "label": s["name"], "description": s["summary"]})
    if len(options) < 2:
        return None
    return {
        "id": STYLE_QUESTION_ID,
        "prompt": "Which visual style should it use?",
        "options": options,
        "multiSelect": False,
        "allowAllOptions": False,
        "group": "Style",
    }
