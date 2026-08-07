"""
Param-coverage check (AM2c).

Every plan param name must appear in generated source so Studio controls
are not orphaned.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class ParamCoverageResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)


def _param_names_from_plan(plan: dict[str, Any] | None) -> list[str]:
    if not isinstance(plan, dict):
        return []
    params = plan.get("params")
    if not isinstance(params, list):
        return []
    names: list[str] = []
    for p in params:
        if isinstance(p, dict):
            name = p.get("name")
            if isinstance(name, str) and name.strip():
                names.append(name.strip())
    return names


def _name_referenced(code: str, name: str) -> bool:
    """True if param name is referenced as a string key or params.<name>."""
    if not name:
        return True
    # Quoted string key in schema / defaults
    if re.search(rf"""['"]{re.escape(name)}['"]""", code):
        return True
    # params.name / c.params.name
    if re.search(rf"\bparams\s*\.\s*{re.escape(name)}\b", code):
        return True
    # params["name"] / params['name']
    if re.search(rf"""params\s*\[\s*['"]{re.escape(name)}['"]\s*\]""", code):
        return True
    return False


def run_param_coverage(
    code: str,
    plan: dict[str, Any] | None,
) -> ParamCoverageResult:
    """
    Check that each plan param name is referenced in tool source.

    No plan / empty params → pass (nothing to cover).
    """
    names = _param_names_from_plan(plan)
    if not names:
        return ParamCoverageResult(ok=True, errors=[], missing=[])

    text = code or ""
    missing = [n for n in names if not _name_referenced(text, n)]
    if not missing:
        return ParamCoverageResult(ok=True, errors=[], missing=[])

    errors = [
        "param_coverage: plan param(s) not referenced in code: "
        + ", ".join(missing)
    ]
    return ParamCoverageResult(ok=False, errors=errors, missing=missing)
