"""
Tools HTTP surface (M3g + M5c + M7d + M8a + M8b + M8c).

GET  /api/v1/tools/{toolId}         — owner read + latest version + draft state
PATCH /api/v1/tools/{toolId}/draft  — owner replace draft params / asset bindings
POST /api/v1/tools/{toolId}/publish — owner publish (share + gallery gates + thumb)
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.auth.types import AuthUser
from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.db.types import ToolRow
from core.config import Settings, get_settings
from core.deps import get_assets_repo, get_tools_repo
from core.security import get_current_user
from schemas.tools import (
    ToolDraftPatchRequest,
    ToolPublishRequest,
    ToolResponse,
    ToolVersionResponse,
)
from services.public_tool import (
    PublicToolError,
    PublishGateError,
    publish_tool_for_share,
    unpublish_tool,
)
from services.update_tool_draft import DraftValidationError, update_tool_draft
from services.upload_asset import asset_public_url

router = APIRouter(prefix="/tools", tags=["tools"])


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


def _tool_response(
    tool: ToolRow,
    *,
    latest: ToolVersionResponse | None,
    api_public_base_url: str,
) -> ToolResponse:
    draft_params = tool.draft_params if isinstance(tool.draft_params, dict) else {}
    draft_assets = tool.draft_assets if isinstance(tool.draft_assets, dict) else {}
    thumb_id = (
        str(tool.thumbnail_asset_id) if tool.thumbnail_asset_id is not None else None
    )
    thumb_url = (
        asset_public_url(api_public_base_url=api_public_base_url, asset_id=thumb_id)
        if thumb_id
        else None
    )
    return ToolResponse(
        id=str(tool.id),
        public_id=tool.public_id,
        owner_user_id=tool.owner_user_id,
        status=tool.status,
        title=tool.title,
        description=tool.description,
        tags=list(tool.tags or []),
        published_at=_utc_iso(tool.published_at),
        published_version_id=(
            str(tool.published_version_id) if tool.published_version_id else None
        ),
        gallery_ready=bool(tool.gallery_ready),
        export_smoke_at=_utc_iso(tool.export_smoke_at),
        thumbnail_asset_id=thumb_id,
        thumbnail_url=thumb_url,
        created_at=_utc_iso(tool.created_at) or "",
        updated_at=_utc_iso(tool.updated_at) or "",
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
        created_at=_utc_iso(version.created_at) or "",
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
    settings: Settings = Depends(get_settings),
) -> ToolResponse:
    tool = await tools.get_tool_by_id(tool_id)
    if tool is None or tool.owner_user_id != user.id:
        # Hide existence from non-owners
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        )

    latest = await _latest_version_response(tools, tool.id)
    return _tool_response(
        tool,
        latest=latest,
        api_public_base_url=settings.api_public_base_url,
    )


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
    settings: Settings = Depends(get_settings),
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
    return _tool_response(
        tool,
        latest=latest,
        api_public_base_url=settings.api_public_base_url,
    )


@router.post(
    "/{tool_id}/publish",
    response_model=ToolResponse,
    summary="Publish tool (share + optional gallery gates / metadata / thumb)",
)
async def publish_tool(
    tool_id: str,
    body: ToolPublishRequest | None = None,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
    assets: AssetsRepository = Depends(get_assets_repo),
    settings: Settings = Depends(get_settings),
) -> ToolResponse:
    """
    Set status=published so GET /public/tools/{publicId} works.

    M7 thin path: empty body still works (Make public link) — no gallery gates.
    M8a: optional title/description/tags; freezes published_version_id.
    M8b: forGallery=true runs quality gates; on pass sets galleryReady.
         Failures return 422 with structured detail.gates[].
    M8c: thumbnailAssetId attaches gallery thumb (kind=thumb upload).

    Idempotent if already published (keeps first published_at).
    """
    req = body or ToolPublishRequest()
    try:
        tool = await publish_tool_for_share(
            tools=tools,
            tool_id=tool_id,
            owner_user_id=user.id,
            title=req.title,
            description=req.description,
            tags=req.tags,
            freeze_draft=req.freeze_draft,
            for_gallery=req.for_gallery,
            export_smoke_ok=req.export_smoke_ok,
            thumbnail_asset_id=req.thumbnail_asset_id,
            assets=assets,
        )
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        ) from None
    except PublishGateError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.as_detail(),
        ) from None
    except PublicToolError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from None

    latest = await _latest_version_response(tools, tool.id)
    return _tool_response(
        tool,
        latest=latest,
        api_public_base_url=settings.api_public_base_url,
    )


@router.post(
    "/{tool_id}/unpublish",
    response_model=ToolResponse,
    summary="Unpublish tool (full takedown: draft + leave gallery)",
)
async def unpublish_tool_route(
    tool_id: str,
    user: AuthUser = Depends(get_current_user),
    tools: ToolsRepository = Depends(get_tools_repo),
    settings: Settings = Depends(get_settings),
) -> ToolResponse:
    """
    M8f: owner takedown — status=draft, gallery_ready=false.
    Public page and gallery list hide the tool (404).
    """
    try:
        tool = await unpublish_tool(
            tools=tools,
            tool_id=tool_id,
            owner_user_id=user.id,
        )
    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        ) from None

    latest = await _latest_version_response(tools, tool.id)
    return _tool_response(
        tool,
        latest=latest,
        api_public_base_url=settings.api_public_base_url,
    )
