"""Map asyncpg Records → row dataclasses."""

from __future__ import annotations

import json
from typing import Any

from adapters.db.types import AssetRow, GenerationJobRow, ToolRow, ToolVersionRow


def _json_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        return json.loads(value.decode("utf-8"))
    if isinstance(value, str):
        return json.loads(value)
    return value


def tool_from_record(row: Any) -> ToolRow:
    # draft_* added in 003_tool_draft_state; tolerate older test records
    try:
        draft_params = _json_value(row["draft_params"])
    except (KeyError, TypeError):
        draft_params = {}
    try:
        draft_assets = _json_value(row["draft_assets"])
    except (KeyError, TypeError):
        draft_assets = {}
    return ToolRow(
        id=row["id"],
        public_id=str(row["public_id"]),
        owner_user_id=str(row["owner_user_id"]),
        status=str(row["status"]),
        title=row["title"],
        description=row["description"],
        thumbnail_asset_id=row["thumbnail_asset_id"],
        published_at=row["published_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        draft_params=draft_params if isinstance(draft_params, dict) else {},
        draft_assets=draft_assets if isinstance(draft_assets, dict) else {},
    )


def tool_version_from_record(row: Any) -> ToolVersionRow:
    return ToolVersionRow(
        id=row["id"],
        tool_id=row["tool_id"],
        target=str(row["target"]),
        code=str(row["code"] or ""),
        param_schema=_json_value(row["param_schema"]),
        default_params=_json_value(row["default_params"]),
        asset_slots=_json_value(row["asset_slots"]),
        plan=_json_value(row["plan"]),
        created_at=row["created_at"],
    )


def job_from_record(row: Any) -> GenerationJobRow:
    # phase column added in 002_job_phase; tolerate older rows/tests
    phase = None
    try:
        phase = row["phase"]
    except (KeyError, TypeError):
        phase = None
    return GenerationJobRow(
        id=row["id"],
        owner_user_id=str(row["owner_user_id"]),
        tool_id=row["tool_id"],
        status=str(row["status"]),
        vision_text=str(row["vision_text"]),
        inspiration_asset_ids=_json_value(row["inspiration_asset_ids"]) or [],
        error_code=row["error_code"],
        error_message=row["error_message"],
        tokens_used=row["tokens_used"],
        token_budget=row["token_budget"],
        cost_cents=row["cost_cents"],
        repair_budget=int(row["repair_budget"]),
        repairs_used=int(row["repairs_used"]),
        phase=str(phase) if phase is not None else None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def asset_from_record(row: Any) -> AssetRow:
    return AssetRow(
        id=row["id"],
        owner_user_id=str(row["owner_user_id"]),
        kind=str(row["kind"]),
        storage_key=str(row["storage_key"]),
        content_type=str(row["content_type"]),
        byte_size=int(row["byte_size"]),
        original_filename=row["original_filename"],
        tool_id=row["tool_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
