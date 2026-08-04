"""Row types returned by product repositories (M1c)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(frozen=True, slots=True)
class ToolRow:
    id: UUID
    public_id: str
    owner_user_id: str
    status: str
    title: str | None
    description: str | None
    thumbnail_asset_id: UUID | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ToolVersionRow:
    id: UUID
    tool_id: UUID
    target: str
    code: str
    param_schema: Any
    default_params: Any
    asset_slots: Any
    plan: Any | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class GenerationJobRow:
    id: UUID
    owner_user_id: str
    tool_id: UUID | None
    status: str
    vision_text: str
    inspiration_asset_ids: Any
    error_code: str | None
    error_message: str | None
    tokens_used: int | None
    token_budget: int | None
    cost_cents: int | None
    repair_budget: int
    repairs_used: int
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class AssetRow:
    id: UUID
    owner_user_id: str
    kind: str
    storage_key: str
    content_type: str
    byte_size: int
    original_filename: str | None
    tool_id: UUID | None
    created_at: datetime
    updated_at: datetime
