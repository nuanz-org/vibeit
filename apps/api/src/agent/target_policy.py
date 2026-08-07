"""
Multi-target enablement policy (AM6).

canvas2d is always on. p5 / three are config-gated:
  VIBEIT_TARGET_P5_ENABLED=1
  VIBEIT_TARGET_THREE_ENABLED=1
"""

from __future__ import annotations

import os
from typing import Literal

TargetId = Literal["canvas2d", "p5", "three"]
ALL_TARGETS: tuple[TargetId, ...] = ("canvas2d", "p5", "three")
ASAP_TARGET: TargetId = "canvas2d"


def _flag(name: str) -> bool:
    return os.getenv(name, "").lower() in ("1", "true", "yes", "on")


def p5_enabled() -> bool:
    return _flag("VIBEIT_TARGET_P5_ENABLED")


def three_enabled() -> bool:
    return _flag("VIBEIT_TARGET_THREE_ENABLED")


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
