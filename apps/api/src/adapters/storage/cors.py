"""
Storage CORS headers (M0f provisional policy).

Asset image GETs use crossOrigin=anonymous → no credentials.
Do not set Access-Control-Allow-Credentials on these responses.
"""

from __future__ import annotations

# Mirror packages/contracts PROVISIONAL_STORAGE_CORS (dev defaults).
DEFAULT_ALLOWED_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)

DEFAULT_ALLOWED_METHODS = "GET, HEAD, OPTIONS"
DEFAULT_EXPOSE_HEADERS = "Content-Type, Content-Length, ETag"
DEFAULT_MAX_AGE = "86400"


def storage_cors_headers(
    request_origin: str | None,
    *,
    allowed_origins: tuple[str, ...] | list[str] | None = None,
) -> dict[str, str]:
    """
    Response headers for storage/asset raw GETs.

    Reflects Origin when it is allowlisted; otherwise first default origin.
    """
    origins = tuple(allowed_origins) if allowed_origins else DEFAULT_ALLOWED_ORIGINS
    if request_origin and request_origin in origins:
        origin = request_origin
    else:
        origin = origins[0] if origins else "*"

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
        "Access-Control-Expose-Headers": DEFAULT_EXPOSE_HEADERS,
        "Access-Control-Max-Age": DEFAULT_MAX_AGE,
        "Vary": "Origin",
        # Explicitly no credentials — matches ASSET_CROSS_ORIGIN = anonymous
    }


def is_origin_allowed(
    request_origin: str | None,
    *,
    allowed_origins: tuple[str, ...] | list[str] | None = None,
) -> bool:
    if not request_origin:
        return False
    origins = tuple(allowed_origins) if allowed_origins else DEFAULT_ALLOWED_ORIGINS
    return request_origin in origins
