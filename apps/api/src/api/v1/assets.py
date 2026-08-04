"""
Asset HTTP surface.

M1d: GET /assets/raw/{id} — anonymous CORS serve for canvas.
M1e: POST /assets multipart upload + owner GET/DELETE metadata.
"""

from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import Response as PlainResponse

from adapters.auth.types import AuthUser
from adapters.db.repositories.assets import AssetsRepository
from adapters.storage.cors import storage_cors_headers
from adapters.storage.protocol import ObjectStorage
from core.config import Settings, get_settings
from core.deps import get_assets_repo, get_storage
from core.security import get_current_user
from schemas.assets import AssetResponse
from services.upload_asset import (
    UploadValidationError,
    asset_public_url,
    upload_asset,
)

router = APIRouter(prefix="/assets", tags=["assets"])


def _cors(request: Request, settings: Settings) -> dict[str, str]:
    return storage_cors_headers(
        request.headers.get("origin"),
        allowed_origins=settings.storage_cors_origins,
    )


def _to_response(row, *, api_public_base_url: str) -> AssetResponse:
    return AssetResponse(
        id=str(row.id),
        kind=row.kind,  # type: ignore[arg-type]
        url=asset_public_url(
            api_public_base_url=api_public_base_url,
            asset_id=str(row.id),
        ),
        content_type=row.content_type,
        byte_size=row.byte_size,
        original_filename=row.original_filename,
        storage_key=row.storage_key,
    )


@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload inspiration or studio image",
)
async def post_asset(
    kind: str = Form(..., description="inspiration | studio"),
    file: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
    assets: AssetsRepository = Depends(get_assets_repo),
    storage: ObjectStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> AssetResponse:
    data = await file.read()
    try:
        row, _url = await upload_asset(
            owner_user_id=user.id,
            kind=kind.strip().lower(),
            data=data,
            content_type=file.content_type,
            original_filename=file.filename,
            storage=storage,
            assets=assets,
            api_public_base_url=settings.api_public_base_url,
        )
    except UploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return _to_response(row, api_public_base_url=settings.api_public_base_url)


@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Get asset metadata (owner only)",
)
async def get_asset_meta(
    asset_id: str,
    user: AuthUser = Depends(get_current_user),
    assets: AssetsRepository = Depends(get_assets_repo),
    settings: Settings = Depends(get_settings),
) -> AssetResponse:
    row = await assets.get_asset_for_owner(asset_id, owner_user_id=user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _to_response(row, api_public_base_url=settings.api_public_base_url)


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete asset (owner only)",
)
async def delete_asset(
    asset_id: str,
    user: AuthUser = Depends(get_current_user),
    assets: AssetsRepository = Depends(get_assets_repo),
    storage: ObjectStorage = Depends(get_storage),
) -> Response:
    row = await assets.get_asset_for_owner(asset_id, owner_user_id=user.id)
    if row is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    await storage.delete_object(row.storage_key)
    deleted = await assets.delete_asset(asset_id, owner_user_id=user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Asset not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.options("/raw/{asset_id}")
async def options_raw_asset(
    asset_id: str,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Response:
    headers = _cors(request, settings)
    headers["Access-Control-Allow-Headers"] = "Content-Type"
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers=headers)


@router.get("/raw/{asset_id}")
async def get_raw_asset(
    asset_id: str,
    request: Request,
    assets: AssetsRepository = Depends(get_assets_repo),
    storage: ObjectStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> Response:
    """
    Serve asset bytes by id for canvas/img (anonymous CORS).

    No session required — UUID opacity is the local-dev access control.
    """
    row = await assets.get_asset_by_id(asset_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    result = await storage.get_object(row.storage_key)
    if result is None:
        raise HTTPException(status_code=404, detail="Object missing from storage")

    data, content_type = result
    media = row.content_type or content_type
    headers = _cors(request, settings)
    headers["Cache-Control"] = "private, max-age=3600"
    return PlainResponse(content=data, media_type=media, headers=headers)
