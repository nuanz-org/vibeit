"""
M8d — public gallery list + detail (anonymous).

Eligibility: status=published AND gallery_ready=true.
Thin share (published without gallery gates) does NOT appear here.
No owner fields, draft bags, or source code on cards.
"""

from __future__ import annotations

from datetime import datetime, timezone

from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow
from schemas.gallery import GalleryCardResponse, GalleryListResponse
from services.upload_asset import asset_public_url


class GalleryError(Exception):
    def __init__(self, message: str = "Not found") -> None:
        super().__init__(message)
        self.message = message


def _utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def tool_to_gallery_card(
    tool: ToolRow,
    *,
    api_public_base_url: str,
) -> GalleryCardResponse:
    thumb_id = (
        str(tool.thumbnail_asset_id) if tool.thumbnail_asset_id is not None else None
    )
    thumb_url = None
    if thumb_id:
        thumb_url = asset_public_url(
            api_public_base_url=api_public_base_url,
            asset_id=thumb_id,
        )
    return GalleryCardResponse(
        public_id=tool.public_id,
        title=tool.title,
        description=tool.description,
        tags=list(tool.tags or []),
        thumbnail_asset_id=thumb_id,
        thumbnail_url=thumb_url,
        published_at=_utc_iso(tool.published_at),
    )


async def list_gallery(
    *,
    tools: ToolsRepository,
    api_public_base_url: str,
    limit: int = 24,
    offset: int = 0,
) -> GalleryListResponse:
    lim = max(1, min(int(limit), 100))
    off = max(0, int(offset))
    rows = await tools.list_gallery_tools(limit=lim, offset=off)
    has_more = len(rows) > lim
    page = rows[:lim]
    return GalleryListResponse(
        items=[
            tool_to_gallery_card(t, api_public_base_url=api_public_base_url)
            for t in page
        ],
        limit=lim,
        offset=off,
        has_more=has_more,
    )


async def get_gallery_item(
    *,
    tools: ToolsRepository,
    public_id: str,
    api_public_base_url: str,
) -> GalleryCardResponse:
    pid = (public_id or "").strip()
    if not pid:
        raise GalleryError("Not found")
    tool = await tools.get_gallery_tool_by_public_id(pid)
    if tool is None:
        raise GalleryError("Not found")
    return tool_to_gallery_card(tool, api_public_base_url=api_public_base_url)
