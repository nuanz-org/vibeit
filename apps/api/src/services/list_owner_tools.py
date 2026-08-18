"""Owner library list — thin cards for /profile."""

from __future__ import annotations

from datetime import datetime, timezone

from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow
from schemas.tools import OwnerToolCardResponse, OwnerToolListResponse
from services.upload_asset import asset_public_url

OWNER_LIST_KINDS = frozenset({"all", "created", "remixed"})


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


def tool_to_owner_card(
    tool: ToolRow,
    *,
    has_runnable_version: bool,
    api_public_base_url: str,
) -> OwnerToolCardResponse:
    thumb_id = (
        str(tool.thumbnail_asset_id) if tool.thumbnail_asset_id is not None else None
    )
    thumb_url = (
        asset_public_url(api_public_base_url=api_public_base_url, asset_id=thumb_id)
        if thumb_id
        else None
    )
    return OwnerToolCardResponse(
        id=str(tool.id),
        public_id=tool.public_id,
        title=tool.title,
        status=tool.status,
        gallery_ready=bool(tool.gallery_ready),
        thumbnail_url=thumb_url,
        updated_at=_utc_iso(tool.updated_at) or "",
        published_at=_utc_iso(tool.published_at),
        is_remix=tool.forked_from_tool_id is not None,
        has_runnable_version=bool(has_runnable_version),
        tags=list(tool.tags or []),
    )


async def list_owner_tools(
    *,
    tools: ToolsRepository,
    owner_user_id: str,
    api_public_base_url: str,
    kind: str = "all",
    limit: int = 24,
    offset: int = 0,
) -> OwnerToolListResponse:
    kind_norm = (kind or "all").strip().lower()
    if kind_norm not in OWNER_LIST_KINDS:
        kind_norm = "all"
    lim = max(1, min(int(limit), 100))
    off = max(0, int(offset))
    rows = await tools.list_tools_for_owner(
        owner_user_id=owner_user_id,
        kind=kind_norm,
        limit=lim,
        offset=off,
    )
    has_more = len(rows) > lim
    page = rows[:lim]
    return OwnerToolListResponse(
        items=[
            tool_to_owner_card(
                tool,
                has_runnable_version=runnable,
                api_public_base_url=api_public_base_url,
            )
            for tool, runnable in page
        ],
        limit=lim,
        offset=off,
        has_more=has_more,
    )
