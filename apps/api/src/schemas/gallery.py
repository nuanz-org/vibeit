"""M8d — public gallery list / detail (no auth)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        serialize_by_alias=True,
        extra="ignore",
    )


class GalleryCardResponse(CamelModel):
    """
    Card payload for gallery list/detail.
    No owner, draft, code, or internal UUID.
    """

    public_id: str = Field(alias="publicId")
    title: str | None = None
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    thumbnail_asset_id: str | None = Field(
        default=None,
        alias="thumbnailAssetId",
    )
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    published_at: str | None = Field(default=None, alias="publishedAt")


class GalleryListResponse(CamelModel):
    items: list[GalleryCardResponse]
    limit: int
    offset: int
    has_more: bool = Field(alias="hasMore")
