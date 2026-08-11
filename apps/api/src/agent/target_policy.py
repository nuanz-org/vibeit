"""
Multi-target enablement + selection policy (AM6 + Track B4).

canvas2d is always on. p5 / three are config-gated:
  AIDITR_TARGET_P5_ENABLED=1
  AIDITR_TARGET_THREE_ENABLED=1

When three is enabled, vision heuristics may prefer three for real 3D craft
(Brik Kinetic Cube Logo class tools).
"""

from __future__ import annotations

import os
import re
from typing import Any, Literal

TargetId = Literal["canvas2d", "p5", "three"]
ALL_TARGETS: tuple[TargetId, ...] = ("canvas2d", "p5", "three")
ASAP_TARGET: TargetId = "canvas2d"

# Strong 3D / materials signals (Brik three-class demos)
_THREE_STRONG = re.compile(
    r"\b("
    r"three\.?js|webgl|three\s*d|3-?d|"
    r"orbit\s*control|orbitcontrols|"
    r"frosted\s*glass|glass\s*material|meshstandard|"
    r"metalness|roughness|pbr|"
    r"perspective\s*camera|webglrenderer|"
    r"chroma\s*cube|kinetic\s*cube|cube\s*logo|"
    r"real\s*3d|true\s*3d"
    r")\b",
    re.IGNORECASE,
)

# Weaker signals — need 2+ hits or combination with "material" / "assembly"
_THREE_WEAK = re.compile(
    r"\b("
    r"mesh|material|materials|assembly|assemble|"
    r"orbit|camera|depth|volumetric|"
    r"cube|sphere|pyramid|icosahedron|"
    r"shader|lighting|directional\s*light"
    r")\b",
    re.IGNORECASE,
)

# 2D-first signals that should keep canvas2d even if weak 3d words appear
_CANVAS2D_LOCK = re.compile(
    r"\b("
    r"canvas\s*2d|flat\s*2d|isometric\s*logo|social\s*frame|"
    r"kinetic\s*type|poster|pixel|distortion\s*card|proximity"
    r")\b",
    re.IGNORECASE,
)


def _flag(name: str) -> bool:
    return os.getenv(name, "").lower() in ("1", "true", "yes", "on")


def p5_enabled() -> bool:
    return _flag("AIDITR_TARGET_P5_ENABLED")


def three_enabled() -> bool:
    return _flag("AIDITR_TARGET_THREE_ENABLED")


def enabled_targets() -> frozenset[TargetId]:
    out: set[TargetId] = {"canvas2d"}
    if p5_enabled():
        out.add("p5")
    if three_enabled():
        out.add("three")
    return frozenset(out)


def is_target_enabled(target: str) -> bool:
    t = (target or "").strip()
    if t == "canvas2d":
        return True
    if t == "p5":
        return p5_enabled()
    if t == "three":
        return three_enabled()
    return False


def resolve_plan_target(raw: object) -> TargetId:
    """
    Normalize plan target: only return enabled targets; else canvas2d.
    """
    if not isinstance(raw, str):
        return ASAP_TARGET
    t = raw.strip().lower()
    if t in ("canvas2d", "p5", "three") and is_target_enabled(t):
        return t  # type: ignore[return-value]
    return ASAP_TARGET


def vision_prefers_three(vision_text: str) -> bool:
    """
    Heuristic: vision clearly wants real three.js craft (materials / 3D logo / orbit).
    Used only when three is config-enabled.
    """
    text = (vision_text or "").strip()
    if not text:
        return False
    if _CANVAS2D_LOCK.search(text) and not _THREE_STRONG.search(text):
        return False
    if _THREE_STRONG.search(text):
        return True
    weak_hits = len(_THREE_WEAK.findall(text))
    return weak_hits >= 3


def vision_prefers_p5(vision_text: str) -> bool:
    text = (vision_text or "").lower()
    if not text:
        return False
    return bool(
        re.search(
            r"\b(p5\.?js|processing\s*sketch|particle\s*field|orbiting\s*particles|"
            r"creative\s*coding\s*sketch)\b",
            text,
        )
    )


def prefer_target_for_vision(vision_text: str) -> TargetId | None:
    """
    Optional preferred target from vision alone (respects enablement).
    Returns None when no strong preference (keep model choice / canvas2d).
    """
    if three_enabled() and vision_prefers_three(vision_text):
        return "three"
    if p5_enabled() and vision_prefers_p5(vision_text):
        return "p5"
    return None


def apply_vision_target_preference(
    plan: dict[str, Any],
    vision_text: str,
) -> dict[str, Any]:
    """
    Soft-upgrade plan.target when config enables three/p5 and vision strongly
    wants that target, but the model stayed on canvas2d.

    Never downgrades an enabled non-canvas2d choice. Always re-resolves via policy.
    """
    out = dict(plan)
    preferred = prefer_target_for_vision(vision_text)
    current = resolve_plan_target(out.get("target"))

    if preferred and current == ASAP_TARGET and preferred != ASAP_TARGET:
        out["target"] = preferred
        if preferred == "three":
            out["targetRationale"] = (
                str(out.get("targetRationale") or "").strip()
                or "Vision asks for real 3D materials / depth (Track B three harness)"
            )[:400]
        elif preferred == "p5":
            out["targetRationale"] = (
                str(out.get("targetRationale") or "").strip()
                or "Vision asks for p5-style sketch / particles"
            )[:400]
    else:
        out["target"] = current

    # Final clamp
    out["target"] = resolve_plan_target(out.get("target"))
    return out


def enabled_targets_prompt_block() -> str:
    """Inject into plan prompts so the model knows what it may pick."""
    enabled = sorted(enabled_targets())
    lines = [
        "Enabled targets for this deployment:",
        f"  {', '.join(enabled)}",
        "- canvas2d is always available (ASAP path).",
    ]
    if "three" in enabled:
        lines.extend(
            [
                "- three is ENABLED: choose target \"three\" for real 3D (meshes, lights, "
                "MeshStandardMaterial variants, cube logos with depth, frosted glass, "
                "orbit-style camera motion, multi-axis shape × assembly × material).",
                "- Prefer three over canvas2d isometric fakes when the vision names "
                "materials, assembly in 3D, WebGL, or Kinetic/Chroma Cube Logo class demos.",
            ]
        )
    else:
        lines.append(
            "- three is DISABLED: never set target \"three\" (will be forced to canvas2d). "
            "Use canvas2d isometric / multi-enum craft for logo variants."
        )
    if "p5" in enabled:
        lines.append(
            "- p5 is ENABLED: use for sketch/particle creative-coding looks only."
        )
    else:
        lines.append("- p5 is DISABLED: do not set target \"p5\".")
    lines.append(
        "If unsure between canvas2d and three when three is enabled, pick three only "
        "when depth/materials matter; otherwise canvas2d."
    )
    return "\n".join(lines)
