"""
Serve stored objects for browser / canvas (M1d).

GET is unauthenticated so img.crossOrigin = "anonymous" works (no cookies).
Security relies on unguessable keys (uuid path segments) — tighten with signed
URLs later for prod if needed.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import Response as PlainResponse

from adapters.storage.cors import storage_cors_headers
from adapters.storage.local import StorageKeyError, validate_storage_key
from adapters.storage.protocol import ObjectStorage
from core.config import Settings, get_settings
from core.deps import get_storage

router = APIRouter(prefix="/storage", tags=["storage"])


def _cors(request: Request, settings: Settings) -> dict[str, str]:
    return storage_cors_headers(
        request.headers.get("origin"),
        allowed_origins=settings.storage_cors_origins,
    )


@router.options("/objects/{object_key:path}")
async def options_object(
    object_key: str,
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Response:
    headers = _cors(request, settings)
    headers["Access-Control-Allow-Headers"] = "Content-Type"
    return Response(status_code=status.HTTP_204_NO_CONTENT, headers=headers)


@router.get("/objects/{object_key:path}")
async def get_object(
    object_key: str,
    request: Request,
    storage: ObjectStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        key = validate_storage_key(object_key)
    except StorageKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await storage.get_object(key)
    if result is None:
        raise HTTPException(status_code=404, detail="Object not found")

    data, content_type = result
    headers = _cors(request, settings)
    headers["Cache-Control"] = "private, max-age=3600"
    return PlainResponse(content=data, media_type=content_type, headers=headers)


@router.head("/objects/{object_key:path}")
async def head_object(
    object_key: str,
    request: Request,
    storage: ObjectStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        key = validate_storage_key(object_key)
    except StorageKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await storage.get_object(key)
    if result is None:
        raise HTTPException(status_code=404, detail="Object not found")

    data, content_type = result
    headers = _cors(request, settings)
    headers["Content-Length"] = str(len(data))
    headers["Content-Type"] = content_type
    return Response(status_code=200, headers=headers)
