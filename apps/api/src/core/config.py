import os
from functools import lru_cache
from pathlib import Path


@lru_cache
def get_settings() -> "Settings":
    return Settings()


def _default_storage_root() -> str:
    # apps/api/.data/uploads when running from apps/api; still absolute via resolve
    return str(Path(__file__).resolve().parents[2] / ".data" / "uploads")


class Settings:
    """Minimal settings until pydantic-settings lands with full API stack."""

    def __init__(self) -> None:
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://vibeit:vibeit@localhost:5432/vibeit",
        )
        # Better Auth default session cookie name (signed cookie prefix may apply)
        self.session_cookie_name: str = os.getenv(
            "BETTER_AUTH_SESSION_COOKIE",
            "better-auth.session_token",
        )

        # --- Object storage (M1d) ---
        # local | s3 | r2 | minio  (only local implemented for ASAP)
        self.storage_backend: str = os.getenv("STORAGE_BACKEND", "local")
        self.storage_local_root: str = os.getenv(
            "STORAGE_LOCAL_ROOT",
            _default_storage_root(),
        )
        # Public origin used in get_url() for browser fetches
        self.api_public_base_url: str = os.getenv(
            "API_PUBLIC_BASE_URL",
            "http://localhost:8000",
        ).rstrip("/")
        # Comma-separated web origins allowed for asset CORS (anonymous)
        raw_origins = os.getenv(
            "STORAGE_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
        self.storage_cors_origins: tuple[str, ...] = tuple(
            o.strip() for o in raw_origins.split(",") if o.strip()
        )