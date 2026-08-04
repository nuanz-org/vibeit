"""Tool / version API shapes (M3g)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )


class ToolVersionResponse(CamelModel):
    id: str
    tool_id: str = Field(alias="toolId")
    target: str
    code: str
    param_schema: Any = Field(alias="paramSchema")
    default_params: Any = Field(alias="defaultParams")
    asset_slots: Any = Field(alias="assetSlots")
    plan: Any | None = None
    created_at: str = Field(alias="createdAt")


class ToolResponse(CamelModel):
    id: str
    public_id: str = Field(alias="publicId")
    owner_user_id: str = Field(alias="ownerUserId")
    status: str
    title: str | None = None
    description: str | None = None
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    latest_version: ToolVersionResponse | None = Field(
        default=None,
        alias="latestVersion",
    )
