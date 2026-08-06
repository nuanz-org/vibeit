"""Upload asset use-case (M1e): validate → storage → assets row → URL."""

from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from adapters.db.repositories.assets import AssetsRepository
from adapters.db.types import AssetRow
from adapters.storage.protocol import ObjectStorage

ALLOWED_MIME = frozenset(
    {
        "image/png",
        "image/jpeg",
        "image/webp",
    }
)
# Map common UploadFile content_type aliases
_MIME_ALIASES = {
    "image/jpg": "image/jpeg",
}

# M8c: thumb for gallery frame grab; export reserved for later product exports
UPLOAD_KINDS = frozenset({"inspiration", "studio", "thumb", "export"})
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
# Gallery thumbs stay small
THUMB_MAX_BYTES = 2 * 1024 * 1024  # 2 MB

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._\-]+")


class UploadValidationError(ValueError):
    """Client-facing validation failure (→ 400/422)."""


def _normalize_content_type(raw: str | None) -> str:
    ct = (raw or "").split(";")[0].strip().lower()
    return _MIME_ALIASES.get(ct, ct)


def _safe_filename(name: str | None) -> str:
    base = Path(name or "upload").name
    cleaned = _SAFE_NAME.sub("_", base).strip("._") or "upload"
    return cleaned[:120]


def build_storage_key(*, kind: str, owner_user_id: str, asset_id: str, filename: str) -> str:
    return f"{kind}/{owner_user_id}/{asset_id}/{filename}"


def asset_public_url(*, api_public_base_url: str, asset_id: str) -> str:
    """Stable browser URL for canvas (CORS via /assets/raw)."""
    base = api_public_base_url.rstrip("/")
    return f"{base}/api/v1/assets/raw/{asset_id}"


async def upload_asset(
    *,
    owner_user_id: str,
    kind: str,
    data: bytes,
    content_type: str | None,
    original_filename: str | None,
    storage: ObjectStorage,
    assets: AssetsRepository,
    api_public_base_url: str,
    max_bytes: int = DEFAULT_MAX_BYTES,
    tool_id: str | None = None,
) -> tuple[AssetRow, str]:
    """
    Persist bytes + DB row.

    Returns (asset_row, public_url).
    tool_id (optional, M5d): link studio upload to an owned tool.
    """
    if kind not in UPLOAD_KINDS:
        raise UploadValidationError(
            f"kind must be one of {sorted(UPLOAD_KINDS)}, got {kind!r}"
        )

    mime = _normalize_content_type(content_type)
    if mime not in ALLOWED_MIME:
        raise UploadValidationError(
            f"content type not allowed: {mime or '(empty)'}; "
            f"allowed: {', '.join(sorted(ALLOWED_MIME))}"
        )

    if not data:
        raise UploadValidationError("empty file")

    limit = THUMB_MAX_BYTES if kind == "thumb" else max_bytes
    if len(data) > limit:
        raise UploadValidationError(
            f"file too large: {len(data)} bytes (max {limit})"
        )

    asset_id = uuid4()
    filename = _safe_filename(original_filename)
    # Ensure extension hints for browsers when missing
    if "." not in filename:
        ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(
            mime, ""
        )
        filename = f"{filename}{ext}"

    storage_key = build_storage_key(
        kind=kind,
        owner_user_id=owner_user_id,
        asset_id=str(asset_id),
        filename=filename,
    )

    await storage.put_object(storage_key, data, mime)

    try:
        row = await assets.create_asset(
            asset_id=asset_id,
            owner_user_id=owner_user_id,
            kind=kind,
            storage_key=storage_key,
            content_type=mime,
            byte_size=len(data),
            original_filename=original_filename or filename,
            tool_id=tool_id,
        )
    except Exception:
        # Best-effort cleanup if DB insert fails
        await storage.delete_object(storage_key)
        raise

    url = asset_public_url(api_public_base_url=api_public_base_url, asset_id=str(row.id))
    return row, url
