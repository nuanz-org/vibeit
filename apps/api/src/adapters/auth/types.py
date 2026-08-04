from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AuthUser:
    """Identity resolved from Better Auth session + user rows."""

    id: str
    email: str
    name: str
    email_verified: bool