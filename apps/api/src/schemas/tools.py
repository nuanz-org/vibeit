"""Tool / version API shapes (M3g + M5c draft state)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    # M5c: Studio personalization (owner-only GET)
    draft_params: dict[str, Any] = Field(
        default_factory=dict,
        alias="draftParams",
    )
    draft_assets: dict[str, Any] = Field(
        default_factory=dict,
        alias="draftAssets",
    )


class ToolDraftPatchRequest(CamelModel):
    """
    Full-replace bags for fields that are present.
    At least one of draftParams / draftAssets required.
    """

    draft_params: dict[str, Any] | None = Field(default=None, alias="draftParams")
    draft_assets: dict[str, Any] | None = Field(default=None, alias="draftAssets")

    @model_validator(mode="after")
    def _require_one_bag(self) -> ToolDraftPatchRequest:
        if self.draft_params is None and self.draft_assets is None:
            raise ValueError("Provide draftParams and/or draftAssets")
        return self


# ---------------------------------------------------------------------------
# M7d — public tool surface (anonymous read of published tools)
# ---------------------------------------------------------------------------


class PublicToolVersionResponse(CamelModel):
    """
    Version payload enough to mount in the public sandbox.
    Code is included for runtime load — not a download endpoint.
    """

    id: str
    target: str
    code: str
    param_schema: Any = Field(alias="paramSchema")
    default_params: Any = Field(alias="defaultParams")
    asset_slots: Any = Field(alias="assetSlots")


class PublicToolResponse(CamelModel):
    """
    Anonymous public tool view.
    No ownerUserId, no draftParams/draftAssets, no plan (owner/codegen noise).
    """

    public_id: str = Field(alias="publicId")
    status: str
    title: str | None = None
    description: str | None = None
    published_at: str | None = Field(default=None, alias="publishedAt")
    version: PublicToolVersionResponse
