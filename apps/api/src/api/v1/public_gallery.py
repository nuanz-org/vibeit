"""
M8d — public gallery HTTP surface (no auth).

GET /api/v1/public/gallery              — list gallery-ready published tools
GET /api/v1/public/gallery/{publicId}   — one card (metadata only)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from adapters.db.repositories.tools import ToolsRepository
from core.config import Settings, get_settings
from core.deps import get_tools_repo
from schemas.gallery import GalleryCardResponse, GalleryListResponse
from services.gallery import GalleryError, get_gallery_item, list_gallery

router = APIRouter(prefix="/public/gallery", tags=["public-gallery"])


@router.get(
    "",
    response_model=GalleryListResponse,
    summary="List gallery-ready published tools (anonymous)",
)
async def get_gallery_list(
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tools: ToolsRepository = Depends(get_tools_repo),
    settings: Settings = Depends(get_settings),
) -> GalleryListResponse:
    return await list_gallery(
        tools=tools,
        api_public_base_url=settings.api_public_base_url,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{public_id}",
    response_model=GalleryCardResponse,
    summary="Gallery card by publicId (anonymous; gallery-ready only)",
)
async def get_gallery_card(
    public_id: str,
    tools: ToolsRepository = Depends(get_tools_repo),
    settings: Settings = Depends(get_settings),
) -> GalleryCardResponse:
    try:
        return await get_gallery_item(
            tools=tools,
            public_id=public_id,
            api_public_base_url=settings.api_public_base_url,
        )
    except GalleryError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        ) from None
