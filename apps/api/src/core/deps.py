from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from adapters.auth.better_auth import BetterAuthSessionValidator
from core.config import Settings, get_settings


def get_db_pool(request: Request):
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise RuntimeError(
            "Database pool not initialized. Ensure lifespan creates app.state.db_pool."
        )
    return pool


def get_auth_validator(
    pool=Depends(get_db_pool),
) -> BetterAuthSessionValidator:
    return BetterAuthSessionValidator(pool)


DbPool = Annotated[object, Depends(get_db_pool)]
AuthValidator = Annotated[BetterAuthSessionValidator, Depends(get_auth_validator)]
SettingsDep = Annotated[Settings, Depends(get_settings)]