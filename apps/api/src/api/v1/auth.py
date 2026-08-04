from fastapi import APIRouter, Depends

from adapters.auth.types import AuthUser
from core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user: AuthUser = Depends(get_current_user)) -> dict:
    """Return the authenticated Better Auth user (session cookie required)."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "emailVerified": user.email_verified,
    }