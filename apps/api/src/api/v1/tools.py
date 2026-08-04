"""
Tools HTTP surface (M3g + M5c).

GET  /api/v1/tools/{toolId}       — owner read + latest version + draft state
PATCH /api/v1/tools/{toolId}/draft — owner replace draft params / asset bindings
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.auth.types import AuthUser
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow
from core.deps import get_tools_repo
from core.security import get_current_user
from schemas.tools import ToolDraftPatchRequest, ToolResponse, ToolVersionResponse
from services.update_tool_draft import DraftValidationError, update_tool_draft

router = APIRouter(prefix="/tools", tags=["tools"])


def _utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _tool_response(
    tool: ToolRow,
    *,
    latest: ToolVersionResponse | None,
) -> ToolResponse:
    draft_params = tool.draft_params if isinstance(tool.draft_params, dict) else {}
    draft_assets = tool.draft_assets if isinstance(tool.draft_assets, dict) else {}
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
        draft_params=draft_params,
        draft_assets=draft_assets,
    )


async def _latest_version_response(
    tools: ToolsRepository,
    tool_id: object,
) -> ToolVersionResponse | None:
    version = await tools.get_latest_tool_version(tool_id)  # type: ignore[arg-type]
    if version is None:
        return None
    return ToolVersionResponse(
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


@router.get(
    "/{tool_id}",
    response_model=ToolResponse,
    summary="Get owned tool + latest version + draft state",
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

    latest = await _latest_version_response(tools, tool.id)
    return _tool_response(tool, latest=latest)


@router.patch(
    "/{tool_id}/draft",
    response_model=ToolResponse,
    summary="Replace owner Studio draft params and/or asset bindings",
)
async def patch_tool_draft(
    tool_id: str,
    body: ToolDraftPatchRequest,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
) -> ToolResponse:
    try:
        tool = await update_tool_draft(
            tools=tools,
            tool_id=tool_id,
            owner_user_id=user.id,
            draft_params=body.draft_params,
            draft_assets=body.draft_assets,
        )
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        ) from None
    except DraftValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from None

    latest = await _latest_version_response(tools, tool.id)
    return _tool_response(tool, latest=latest)
