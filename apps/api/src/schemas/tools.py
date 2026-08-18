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
    tags: list[str] = Field(default_factory=list)
    published_at: str | None = Field(default=None, alias="publishedAt")
    published_version_id: str | None = Field(
        default=None,
        alias="publishedVersionId",
    )
    gallery_ready: bool = Field(default=False, alias="galleryReady")
    export_smoke_at: str | None = Field(default=None, alias="exportSmokeAt")
    thumbnail_asset_id: str | None = Field(
        default=None,
        alias="thumbnailAssetId",
    )
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
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
    # Continuous Studio refine transcript (tool-scoped)
    chat_history: list[Any] = Field(
        default_factory=list,
        alias="chatHistory",
    )


class ToolPublishRequest(CamelModel):
    """
    M8a/M8b optional publish body. All fields optional for thin M7 share compat.
    Empty body / omitted fields keep existing tool metadata.

    forGallery=true runs quality gates and sets galleryReady on success.
    exportSmokeOk must be true for gallery (client proved captureFrame/PNG).
    """

    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    freeze_draft: bool = Field(default=False, alias="freezeDraft")
    for_gallery: bool = Field(default=False, alias="forGallery")
    export_smoke_ok: bool = Field(default=False, alias="exportSmokeOk")
    # M8c: asset id from POST /assets kind=thumb (omit to keep existing)
    thumbnail_asset_id: str | None = Field(
        default=None,
        alias="thumbnailAssetId",
    )


class PublishGateFailureItem(CamelModel):
    code: str
    message: str


class PublishGatesFailedDetail(CamelModel):
    """Structured 422 detail when gallery gates fail."""

    message: str = "Publish gates failed"
    code: str = "GATES_FAILED"
    gates: list[PublishGateFailureItem] = Field(default_factory=list)


class OwnerToolCardResponse(CamelModel):
    """Thin library card — no code, draft bags, or chat."""

    id: str
    public_id: str = Field(alias="publicId")
    title: str | None = None
    status: str
    gallery_ready: bool = Field(default=False, alias="galleryReady")
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    updated_at: str = Field(alias="updatedAt")
    published_at: str | None = Field(default=None, alias="publishedAt")
    is_remix: bool = Field(alias="isRemix")
    has_runnable_version: bool = Field(alias="hasRunnableVersion")
    tags: list[str] = Field(default_factory=list)


class OwnerToolListResponse(CamelModel):
    items: list[OwnerToolCardResponse]
    limit: int
    offset: int
    has_more: bool = Field(alias="hasMore")


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
    tags: list[str] = Field(default_factory=list)
    published_at: str | None = Field(default=None, alias="publishedAt")
    published_version_id: str | None = Field(
        default=None,
        alias="publishedVersionId",
    )
    thumbnail_asset_id: str | None = Field(
        default=None,
        alias="thumbnailAssetId",
    )
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    version: PublicToolVersionResponse
