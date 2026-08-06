"""
Public tools HTTP surface (M7d).

GET /api/v1/public/tools/{publicId} — anonymous read of published tools only.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from adapters.db.repositories.tools import ToolsRepository
from core.config import Settings, get_settings
from core.deps import get_tools_repo
from schemas.tools import PublicToolResponse
from services.public_tool import PublicToolError, get_public_tool

router = APIRouter(prefix="/public/tools", tags=["public-tools"])


@router.get(
    "/{public_id}",
    response_model=PublicToolResponse,
    summary="Get published tool by publicId (no auth)",
)
async def get_public_tool_by_public_id(
    public_id: str,
    tools: ToolsRepository = Depends(get_tools_repo),
    settings: Settings = Depends(get_settings),
) -> PublicToolResponse:
    try:
        return await get_public_tool(
            tools=tools,
            public_id=public_id,
            api_public_base_url=settings.api_public_base_url,
        )
    except PublicToolError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found",
        ) from None
