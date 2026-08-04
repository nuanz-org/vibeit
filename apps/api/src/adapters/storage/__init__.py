"""Object storage adapters."""

from adapters.storage.local import LocalFilesystemStorage, StorageKeyError, validate_storage_key
from adapters.storage.protocol import ObjectStorage

__all__ = [
    "LocalFilesystemStorage",
    "ObjectStorage",
    "StorageKeyError",
    "validate_storage_key",
    "create_storage",
]


def create_storage(
    *,
    backend: str,
    local_root: str,
    public_base_url: str,
) -> ObjectStorage:
    """Factory from settings. Only `local` is implemented in M1d."""
    backend = (backend or "local").lower().strip()
    if backend == "local":
        return LocalFilesystemStorage(
            root=local_root,
            public_base_url=public_base_url,
        )
    if backend in {"s3", "r2", "minio"}:
        raise NotImplementedError(
            f"STORAGE_BACKEND={backend!r} is not implemented yet; use local for M1d."
        )
    raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}")
