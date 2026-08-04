"""
Validate Better Auth sessions against shared Postgres.

Better Auth stores sessions in `session` (token, userId, expiresAt) and users
in `user`. The browser sends the session token as cookie `better-auth.session_token`
(see better-auth defaults). Cookie value may be URL-encoded or signed; we accept
the raw token string after optional unquoting / signature strip.
"""

from __future__ import annotations

import urllib.parse
from datetime import datetime, timezone

from adapters.auth.types import AuthUser


# Default Better Auth core table/column names (camelCase).
_SESSION_QUERY = """
SELECT
  u.id AS user_id,
  u.email AS email,
  u.name AS name,
  u."emailVerified" AS email_verified
FROM session s
JOIN "user" u ON u.id = s."userId"
WHERE s.token = $1
  AND s."expiresAt" > $2
LIMIT 1
"""


def normalize_session_token(raw: str | None) -> str | None:
    """
    Normalize cookie value to the session token stored in DB.

    Better Auth sets a signed cookie via better-call:
    URL-encoded `{token}.{base64_hmac}` where the signature is 44 chars and ends
    with `=`. The DB `session.token` column stores the unsigned token only.
    """
    if not raw:
        return None
    token = urllib.parse.unquote(raw.strip())
    if not token:
        return None

    # Prefer lastIndexOf split matching better-call getSignedCookie.
    sig_pos = token.rfind(".")
    if sig_pos > 0:
        signature = token[sig_pos + 1 :]
        # HMAC-SHA256 as base64 is typically 44 chars ending with =
        if len(signature) == 44 and signature.endswith("="):
            return token[:sig_pos]
    return token


class BetterAuthSessionValidator:
    """Looks up Better Auth session rows via an asyncpg-compatible connection."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def get_user_for_session_token(self, token: str) -> AuthUser | None:
        normalized = normalize_session_token(token)
        if not normalized:
            return None

        now = datetime.now(timezone.utc)

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(_SESSION_QUERY, normalized, now)
            if row is None:
                return None
            return AuthUser(
                id=str(row["user_id"]),
                email=str(row["email"]),
                name=str(row["name"] or ""),
                email_verified=bool(row["email_verified"]),
            )