"""
Tools HTTP surface (M3g).

GET /api/v1/tools/{toolId} — owner read with latest version (Studio load).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.auth.types import AuthUser
from adapters.db.repositories.tools import ToolsRepository
from core.deps import get_tools_repo
from core.security import get_current_user
from schemas.tools import ToolResponse, ToolVersionResponse

router = APIRouter(prefix="/tools", tags=["tools"])


def _utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


@router.get(
    "/{tool_id}",
    response_model=ToolResponse,
    summary="Get owned tool + latest version",
)
async def get_tool(
    tool_id: str,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
) -> ToolResponse:
    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != user.id:
        # Hide existence from non-owners
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        )

    version = await tools.get_latest_tool_version(tool.id)
    latest = None
    if version is not None:
        latest = ToolVersionResponse(
            id=str(version.id),
            tool_id=str(version.tool_id),
            target=version.target,
            code=version.code,
            param_schema=version.param_schema,
            default_params=version.default_params,
            asset_slots=version.asset_slots,
            plan=version.plan,
            created_at=_utc_iso(version.created_at),
        )

    return ToolResponse(
        id=str(tool.id),
        public_id=tool.public_id,
        owner_user_id=tool.owner_user_id,
        status=tool.status,
        title=tool.title,
        description=tool.description,
        created_at=_utc_iso(tool.created_at),
        updated_at=_utc_iso(tool.updated_at),
        latest_version=latest,
    )
