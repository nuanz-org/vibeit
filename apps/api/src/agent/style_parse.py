"""
Parse StyleNotes JSON from the style-extract vision agent (AM5).
"""

from __future__ import annotations

import json
import re
from typing import Any

_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class StyleParseError(ValueError):
    pass


def extract_json_object(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise StyleParseError("empty style extract response")

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw, re.IGNORECASE)
    if fence:
        raw = fence.group(1).strip()

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(raw[start : end + 1])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError as exc:
            raise StyleParseError(f"invalid style JSON: {exc}") from exc
    raise StyleParseError("no JSON object found in style extract response")


def _norm_hex(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not _HEX_RE.match(s):
        return None
    if len(s) == 4:  # #rgb → #rrggbb
        r, g, b = s[1], s[2], s[3]
        s = f"#{r}{r}{g}{g}{b}{b}"
    return s.lower()


def normalize_style_notes(data: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate style notes for plan/codegen consumption."""
    palette_roles: dict[str, str] = {}
    raw_roles = data.get("paletteRoles") or data.get("palette_roles") or {}
    if isinstance(raw_roles, dict):
        for key in ("bg", "ink", "accent", "highlight"):
            hx = _norm_hex(raw_roles.get(key))
            if hx:
                palette_roles[key] = hx

    palette: list[str] = []
    raw_pal = data.get("palette")
    if isinstance(raw_pal, list):
        for c in raw_pal[:8]:
            hx = _norm_hex(c)
            if hx and hx not in palette:
                palette.append(hx)
    for hx in palette_roles.values():
        if hx not in palette:
            palette.append(hx)

    def _str_list(key: str, alt: str | None = None, *, max_n: int = 8) -> list[str]:
        raw = data.get(key)
        if raw is None and alt:
            raw = data.get(alt)
        out: list[str] = []
        if isinstance(raw, list):
            for item in raw[:max_n]:
                if isinstance(item, str) and item.strip():
                    out.append(item.strip()[:200])
        return out

    mood = data.get("mood") or data.get("energy") or ""
    if not isinstance(mood, str):
        mood = str(mood)
    mood = mood.strip()[:300]

    typography = data.get("typography") or data.get("typeFeel") or ""
    if not isinstance(typography, str):
        typography = str(typography)
    typography = typography.strip()[:300]

    motion = data.get("motionHints") or data.get("motion") or ""
    if not isinstance(motion, str):
        motion = str(motion)
    motion = motion.strip()[:300]

    summary = data.get("summary") or data.get("notes") or ""
    if not isinstance(summary, str):
        summary = str(summary)
    summary = summary.strip()[:600]

    do_not = _str_list("doNotCopy", "do_not_copy", max_n=6)
    composition = _str_list("compositionPatterns", "composition", max_n=6)
    tags = _str_list("tags", max_n=6)

    return {
        "summary": summary,
        "mood": mood,
        "palette": palette,
        "paletteRoles": palette_roles,
        "compositionPatterns": composition,
        "typography": typography,
        "motionHints": motion,
        "doNotCopy": do_not,
        "tags": tags,
    }


def parse_style_notes(text: str) -> dict[str, Any]:
    return normalize_style_notes(extract_json_object(text))
