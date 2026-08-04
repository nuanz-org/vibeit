import os
from functools import lru_cache


@lru_cache
def get_settings() -> "Settings":
    return Settings()


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