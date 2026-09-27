"""Load and validate the versioned style registry seed."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from agent.control_catalog.catalog import PARAM_KINDS, PARAM_UI_HINTS

_SEED_PATH = Path(__file__).with_name("styles.seed.json")

STYLE_SLOTS = frozenset({"look", "type"})
STYLE_TIERS = frozenset({"core", "extended"})
IMAGE_MODES = frozenset({"none", "optional", "required"})
COLOR_ROLES = frozenset({"bg", "ink", "accent"})

_REQUIRED_LOOK_SPEC = (
    "essence",
    "palette",
    "typography",
    "composition",
    "texture",
    "lighting",
    "motion",
    "recipe",
    "must",
    "never",
)
_REQUIRED_TYPE_SPEC = ("essence", "rule", "must", "never")


class StyleRegistryError(RuntimeError):
    pass


def style_lock_enabled() -> bool:
    """AIDITR_STYLE_LOCK (default on). Off = legacy pipeline with no style registry."""
    return os.getenv("AIDITR_STYLE_LOCK", "1").strip().lower() not in ("0", "false", "no", "off")


def _entry_errors(entry: dict[str, Any], data: dict[str, Any], ids: set[str]) -> list[str]:
    sid = str(entry.get("id") or "?")
    errors: list[str] = []
    slot = entry.get("slot")
    if slot not in STYLE_SLOTS:
        errors.append(f"{sid}: slot must be one of {sorted(STYLE_SLOTS)}")
    if not str(sid).startswith(f"{slot}."):
        errors.append(f"{sid}: id must start with '{slot}.'")
    if entry.get("tier") not in STYLE_TIERS:
        errors.append(f"{sid}: tier must be core|extended")
    if entry.get("image") not in IMAGE_MODES:
        errors.append(f"{sid}: image must be none|optional|required")
    for key in ("name", "summary", "family"):
        if not str(entry.get(key) or "").strip():
            errors.append(f"{sid}: {key} is required")

    spec = entry.get("spec")
    if not isinstance(spec, dict):
        errors.append(f"{sid}: spec object is required")
    else:
        required = _REQUIRED_LOOK_SPEC if slot == "look" else _REQUIRED_TYPE_SPEC
        for key in required:
            if not spec.get(key):
                errors.append(f"{sid}: spec.{key} is required")
        if slot == "look":
            fonts = (spec.get("typography") or {}).get("fonts") or []
            stacks = data.get("fontStacks") or {}
            for f in fonts:
                if f not in stacks:
                    errors.append(f"{sid}: unknown font stack {f!r}")

    for other in entry.get("conflicts") or []:
        if other not in ids:
            errors.append(f"{sid}: conflict {other!r} is not a registry id")

    rules = data.get("lintRules") or {}
    lint = entry.get("lint") or {}
    for key in ("forbid", "require"):
        for rule in lint.get(key) or []:
            if rule not in rules:
                errors.append(f"{sid}: unknown lint rule {rule!r}")

    names: set[str] = set()
    for ctrl in entry.get("controls") or []:
        name = str(ctrl.get("name") or "")
        if not name or name in names:
            errors.append(f"{sid}: control name missing or duplicated ({name!r})")
        names.add(name)
        if ctrl.get("kind") not in PARAM_KINDS:
            errors.append(f"{sid}: control {name} has invalid kind")
        hint = ctrl.get("uiHint")
        if hint is not None and hint not in PARAM_UI_HINTS:
            errors.append(f"{sid}: control {name} has invalid uiHint {hint!r}")
        role = ctrl.get("role")
        if role is not None and role not in COLOR_ROLES:
            errors.append(f"{sid}: control {name} has invalid role {role!r}")
        if "default" not in ctrl:
            errors.append(f"{sid}: control {name} needs a default")
    if entry.get("image") == "required" and not any(
        c.get("kind") == "assetRef" for c in entry.get("controls") or []
    ):
        errors.append(f"{sid}: image=required needs an assetRef control")
    return errors


def validate_registry(data: dict[str, Any]) -> list[str]:
    """Return a list of human-readable problems (empty when the seed is valid)."""
    errors: list[str] = []
    entries = data.get("entries")
    if not isinstance(entries, list) or not entries:
        return ["entries must be a non-empty list"]
    ids = [str(e.get("id") or "") for e in entries if isinstance(e, dict)]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        errors.append(f"duplicate ids: {sorted(dupes)}")
    for name, rule in (data.get("lintRules") or {}).items():
        try:
            re.compile(str(rule.get("pattern") or ""), re.M)
        except re.error as exc:
            errors.append(f"lint rule {name}: bad pattern ({exc})")
    for entry in entries:
        if isinstance(entry, dict):
            errors.extend(_entry_errors(entry, data, set(ids)))
    return errors


@lru_cache(maxsize=1)
def load_registry() -> dict[str, Any]:
    """Full registry dict: { version, lockPolicy, fontStacks, lintRules, entries }."""
    data = json.loads(_SEED_PATH.read_text(encoding="utf-8"))
    problems = validate_registry(data)
    if problems:
        raise StyleRegistryError(
            "invalid style registry: " + "; ".join(problems[:10])
        )
    return data


def registry_version() -> str:
    return str(load_registry().get("version") or "1")


def active_styles(slot: str | None = None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for e in load_registry()["entries"]:
        if str(e.get("status") or "active") != "active":
            continue
        if slot is not None and e.get("slot") != slot:
            continue
        out.append(e)
    return out


def get_style(style_id: str | None) -> dict[str, Any] | None:
    sid = (style_id or "").strip()
    if not sid:
        return None
    for e in load_registry()["entries"]:
        if e.get("id") == sid and str(e.get("status") or "active") == "active":
            return e
    return None


def style_ids(slot: str | None = None) -> frozenset[str]:
    return frozenset(str(e["id"]) for e in active_styles(slot))


def font_stack(key: str) -> str:
    stacks = load_registry().get("fontStacks") or {}
    return str(stacks.get(key) or stacks.get("system") or "system-ui, sans-serif")


def lock_policy() -> dict[str, list[str]]:
    policy = load_registry().get("lockPolicy") or {}
    return {
        "locked": list(policy.get("locked") or []),
        "adaptable": list(policy.get("adaptable") or []),
    }
