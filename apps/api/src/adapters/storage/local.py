"""Local filesystem object storage for dev (M1d)."""

from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from urllib.parse import quote

# Keys: kind/user_id/asset_id/filename — no path traversal
_SAFE_KEY_RE = re.compile(r"^[a-zA-Z0-9._\-]+(?:/[a-zA-Z0-9._\-]+)*$")


class StorageKeyError(ValueError):
    """Invalid or unsafe object key."""


def validate_storage_key(key: str) -> str:
    key = key.strip().lstrip("/")
    if not key or ".." in key.split("/") or not _SAFE_KEY_RE.match(key):
        raise StorageKeyError(f"invalid storage key: {key!r}")
    return key


class LocalFilesystemStorage:
    """
    Store objects under a local root directory.

    get_url points at the API serve route so the browser can load images
    with CORS (no S3 required for core-loop MVP).
    """

    def __init__(
        self,
        *,
        root: Path | str,
        public_base_url: str,
        serve_prefix: str = "/api/v1/storage/objects",
    ) -> None:
        self._root = Path(root).expanduser().resolve()
        self._root.mkdir(parents=True, exist_ok=True)
        self._public_base_url = public_base_url.rstrip("/")
        self._serve_prefix = serve_prefix.rstrip("/")

    @property
    def root(self) -> Path:
        return self._root

    def _path_for_key(self, key: str) -> Path:
        safe = validate_storage_key(key)
        path = (self._root / safe).resolve()
        if not str(path).startswith(str(self._root)):
            raise StorageKeyError(f"key escapes storage root: {key!r}")
        return path

    async def put_object(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        # Best-effort sidecar for content type (optional; serve also sniffs)
        meta = path.with_suffix(path.suffix + ".ctype")
        meta.write_text(content_type or "application/octet-stream", encoding="utf-8")

    async def delete_object(self, key: str) -> None:
        path = self._path_for_key(key)
        meta = path.with_suffix(path.suffix + ".ctype")
        if path.is_file():
            path.unlink()
        if meta.is_file():
            meta.unlink()

    def get_url(self, key: str) -> str:
        safe = validate_storage_key(key)
        # Keep slashes in path; encode each segment
        encoded = "/".join(quote(seg, safe="") for seg in safe.split("/"))
        return f"{self._public_base_url}{self._serve_prefix}/{encoded}"

    async def get_object(self, key: str) -> tuple[bytes, str] | None:
        path = self._path_for_key(key)
        if not path.is_file():
            return None
        data = path.read_bytes()
        meta = path.with_suffix(path.suffix + ".ctype")
        if meta.is_file():
            content_type = meta.read_text(encoding="utf-8").strip()
        else:
            guessed, _ = mimetypes.guess_type(str(path))
            content_type = guessed or "application/octet-stream"
        return data, content_type
