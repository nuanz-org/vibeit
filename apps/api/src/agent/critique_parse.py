"""
Parse Critique JSON from the critic LLM (AM3).

Schema (minimal):
{
  "overall": 3.2,
  "scores": {
    "composition": 3,
    "motion": 4,
    "palette": 3,
    "typography": 2,
    "params": 4
  },
  "summary": "...",
  "fixes": ["...", "..."]
}
"""

from __future__ import annotations

import json
import re
from typing import Any

CRITIQUE_AXES = (
    "composition",
    "motion",
    "palette",
    "typography",
    "params",
)

DEFAULT_CRITIC_THRESHOLD = 3.5


class CritiqueParseError(ValueError):
    pass


def extract_json_object(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise CritiqueParseError("empty critique response")

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
            raise CritiqueParseError(f"invalid critique JSON: {exc}") from exc
    raise CritiqueParseError("no JSON object found in critique response")


def _clamp_score(value: Any, *, default: float = 3.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    if n < 1:
        return 1.0
    if n > 5:
        return 5.0
    return round(n, 2)


def normalize_critique(data: dict[str, Any]) -> dict[str, Any]:
    """Normalize and validate a critique dict."""
    scores_in = data.get("scores") if isinstance(data.get("scores"), dict) else {}
    scores: dict[str, float] = {}
    for axis in CRITIQUE_AXES:
        raw = scores_in.get(axis, scores_in.get(axis.capitalize()))
        scores[axis] = _clamp_score(raw, default=3.0)

    if data.get("overall") is not None:
        overall = _clamp_score(data.get("overall"))
    else:
        overall = round(sum(scores.values()) / len(scores), 2)

    fixes_raw = data.get("fixes") or data.get("fixList") or []
    fixes: list[str] = []
    if isinstance(fixes_raw, list):
        for item in fixes_raw:
            if isinstance(item, str) and item.strip():
                fixes.append(item.strip()[:400])
    fixes = fixes[:8]

    summary = data.get("summary") or data.get("notes") or ""
    if not isinstance(summary, str):
        summary = str(summary)
    summary = summary.strip()[:800]

    return {
        "overall": overall,
        "scores": scores,
        "summary": summary,
        "fixes": fixes,
    }


def parse_critique(text: str) -> dict[str, Any]:
    """Parse model text → normalized Critique dict."""
    return normalize_critique(extract_json_object(text))
