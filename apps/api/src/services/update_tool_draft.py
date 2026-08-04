"""
M5c: validate + persist Studio draft params / asset bindings on tools.

No LangGraph. No new tool_versions row per save.
"""

from __future__ import annotations

import json
from typing import Any

from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow

# Soft cap so a bad client cannot dump megabytes into jsonb.
_MAX_DRAFT_JSON_BYTES = 64 * 1024


class DraftValidationError(ValueError):
    """Invalid draft payload (maps to HTTP 422)."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _ensure_object(value: Any, *, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise DraftValidationError(f"{field} must be a JSON object")
    # Reject non-string keys (JSON objects are str-keyed after parse, but be safe)
    for k in value:
        if not isinstance(k, str) or not k.strip():
            raise DraftValidationError(f"{field} keys must be non-empty strings")
    raw = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    if len(raw.encode("utf-8")) > _MAX_DRAFT_JSON_BYTES:
        raise DraftValidationError(
            f"{field} exceeds {_MAX_DRAFT_JSON_BYTES} bytes",
        )
    return value


def normalize_draft_params(value: Any) -> dict[str, Any]:
    """Full-replace param bag. Values are JSON-serializable scalars/objects."""
    obj = _ensure_object(value, field="draftParams")
    # Keep values JSON-safe; no further schema validation in M5c (schema is tool-specific).
    return dict(obj)


def normalize_draft_assets(value: Any) -> dict[str, Any]:
    """
    Full-replace asset bindings: slotId → http(s) URL string or null.
    Reject data:/blob: so capture CORS path stays clean for persisted state.
    """
    obj = _ensure_object(value, field="draftAssets")
    out: dict[str, Any] = {}
    for slot_id, ref in obj.items():
        if ref is None:
            out[slot_id] = None
            continue
        if not isinstance(ref, str):
            raise DraftValidationError(
                f"draftAssets[{slot_id!r}] must be a string URL or null",
            )
        url = ref.strip()
        if not url:
            out[slot_id] = None
            continue
        lower = url.lower()
        if lower.startswith("data:") or lower.startswith("blob:"):
            raise DraftValidationError(
                f"draftAssets[{slot_id!r}] must be http(s), not data:/blob:",
            )
        if not (lower.startswith("http://") or lower.startswith("https://")):
            raise DraftValidationError(
                f"draftAssets[{slot_id!r}] must be an absolute http(s) URL",
            )
        out[slot_id] = url
    return out


async def update_tool_draft(
    *,
    tools: ToolsRepository,
    tool_id: str,
    owner_user_id: str,
    draft_params: Any | None,
    draft_assets: Any | None,
) -> ToolRow:
    """
    Owner-only draft update. Raises LookupError if missing/non-owner (→ 404).
    Raises DraftValidationError on bad payload (→ 422).
    """
    if draft_params is None and draft_assets is None:
        raise DraftValidationError(
            "Provide draftParams and/or draftAssets",
        )

    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise LookupError("Tool not found")

    params_norm = (
        normalize_draft_params(draft_params) if draft_params is not None else None
    )
    assets_norm = (
        normalize_draft_assets(draft_assets) if draft_assets is not None else None
    )

    updated = await tools.update_tool_draft_state(
        tool.id,
        draft_params=params_norm,
        draft_assets=assets_norm,
    )
    if updated is None:
        raise LookupError("Tool not found")
    return updated
