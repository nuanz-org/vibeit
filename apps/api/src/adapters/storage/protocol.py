"""Object storage port (M1d). Swap local FS ↔ S3-compatible later."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class ObjectStorage(Protocol):
    """Minimal surface for inspiration/studio assets (exports later)."""

    async def put_object(self, key: str, data: bytes, content_type: str) -> None:
        """Write bytes at key. Overwrites if present."""
        ...

    async def delete_object(self, key: str) -> None:
        """Delete key; no-op if missing."""
        ...

    def get_url(self, key: str) -> str:
        """
        URL the browser can fetch (public, signed, or API-served).

        Local adapter returns an API path under /api/v1/storage/objects/...
        with CORS suitable for crossOrigin=anonymous (M0f).
        """
        ...

    async def get_object(self, key: str) -> tuple[bytes, str] | None:
        """
        Read bytes + content_type for local/API serve.

        Returns None if missing. S3 adapters may implement via download
        or leave unused when get_url points at the bucket directly.
        """
        ...
