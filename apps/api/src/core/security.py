from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status

from adapters.auth.types import AuthUser
from core.deps import get_auth_validator

# Better Auth default cookie names (see better-auth cookies module).
_SESSION_COOKIE_CANDIDATES = (
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
)


def _session_token_from_request(request: Request) -> str | None:
    for name in _SESSION_COOKIE_CANDIDATES:
        value = request.cookies.get(name)
        if value:
            return value
    return None


async def get_current_user(
    request: Request,
    auth_validator=Depends(get_auth_validator),
) -> AuthUser:
    """
    FastAPI dependency: require a valid Better Auth session cookie.

    Reads the Better Auth session cookie and validates it against the shared
    Postgres `session` + `user` tables.
    """
    session_token = _session_token_from_request(request)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user = await auth_validator.get_user_for_session_token(session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return user


async def get_optional_user(
    request: Request,
    auth_validator=Depends(get_auth_validator),
) -> AuthUser | None:
    session_token = _session_token_from_request(request)
    if not session_token:
        return None
    return await auth_validator.get_user_for_session_token(session_token)