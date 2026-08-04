from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from adapters.auth.better_auth import BetterAuthSessionValidator
from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
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


def get_tools_repo(pool=Depends(get_db_pool)) -> ToolsRepository:
    return ToolsRepository(pool)


def get_jobs_repo(pool=Depends(get_db_pool)) -> JobsRepository:
    return JobsRepository(pool)


def get_assets_repo(pool=Depends(get_db_pool)) -> AssetsRepository:
    return AssetsRepository(pool)


DbPool = Annotated[object, Depends(get_db_pool)]
AuthValidator = Annotated[BetterAuthSessionValidator, Depends(get_auth_validator)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
ToolsRepo = Annotated[ToolsRepository, Depends(get_tools_repo)]
JobsRepo = Annotated[JobsRepository, Depends(get_jobs_repo)]
AssetsRepo = Annotated[AssetsRepository, Depends(get_assets_repo)]