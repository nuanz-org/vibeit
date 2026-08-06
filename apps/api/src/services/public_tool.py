"""
M7d — public tool read + thin owner publish-for-share.

Access (access-rules.md):
- Draft tools are never returned on the public surface (404 hide).
- Published tools are readable anonymously by public_id.
- No source *download* route — code may appear in JSON for sandbox mount only.
- Owner draft personalization is not exposed publicly (version defaults only).
"""

from __future__ import annotations

from datetime import datetime, timezone

from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow, ToolVersionRow
from schemas.tools import PublicToolResponse, PublicToolVersionResponse


class PublicToolError(Exception):
    def __init__(self, message: str, *, code: str = "NOT_FOUND") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


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


def to_public_tool_response(
    tool: ToolRow,
    version: ToolVersionRow,
) -> PublicToolResponse:
    return PublicToolResponse(
        public_id=tool.public_id,
        status=tool.status,
        title=tool.title,
        description=tool.description,
        published_at=_utc_iso(tool.published_at),
        version=PublicToolVersionResponse(
            id=str(version.id),
            target=version.target,
            code=version.code,
            param_schema=version.param_schema,
            default_params=version.default_params,
            asset_slots=version.asset_slots,
        ),
    )


async def get_public_tool(
    *,
    tools: ToolsRepository,
    public_id: str,
) -> PublicToolResponse:
    """
    Load a published tool by public_id for anonymous /t/:publicId.
    Raises PublicToolError if missing, draft, or no version.
    """
    pid = (public_id or "").strip()
    if not pid:
        raise PublicToolError("Tool not found")

    tool = await tools.get_published_tool_by_public_id(pid)
    if tool is None:
        # Hide draft existence: same 404 as unknown id
        raise PublicToolError("Tool not found")

    version = await tools.get_latest_tool_version(tool.id)
    if version is None:
        raise PublicToolError("Tool not found")

    return to_public_tool_response(tool, version)


async def publish_tool_for_share(
    *,
    tools: ToolsRepository,
    tool_id: str,
    owner_user_id: str,
) -> ToolRow:
    """
    Thin make-public (no gallery). Sets status=published + published_at.
    Requires an existing tool_version so public mount has code.
    Raises LookupError if not found/not owner; PublicToolError if no version.
    """
    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != owner_user_id:
        raise LookupError("Tool not found")

    version = await tools.get_latest_tool_version(tool.id)
    if version is None:
        raise PublicToolError(
            "Cannot publish a tool without a version",
            code="NO_VERSION",
        )

    updated = await tools.set_tool_published(
        tool.id,
        owner_user_id=owner_user_id,
    )
    if updated is None:
        raise LookupError("Tool not found")
    return updated
