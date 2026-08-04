from typing import Protocol

from adapters.auth.types import AuthUser


class AuthSessionValidator(Protocol):
    """Port for validating a browser/API session token."""

    async def get_user_for_session_token(self, token: str) -> AuthUser | None:
        """Return the authenticated user for a valid session token, or None."""
        ...