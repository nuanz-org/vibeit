from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from adapters.auth.better_auth import BetterAuthSessionValidator
from adapters.db.repositories.assets import AssetsRepository
from adapters.db.repositories.jobs import JobsRepository
from adapters.db.repositories.tools import ToolsRepository
from adapters.storage import create_storage
from adapters.storage.protocol import ObjectStorage
from core.config import Settings, get_settings


def get_db_pool(request: Request):
    pool = getattr(request.app.state, "db_pool", None)
    if pool is None:
        raise RuntimeError(
            "Database pool not initialized. Ensure lifespan creates app.state.db_pool."
        )
    return pool


def get_storage(request: Request) -> ObjectStorage:
    storage = getattr(request.app.state, "storage", None)
    if storage is None:
        # Lazy create if lifespan skipped (tests)
        settings = get_settings()
        storage = create_storage(
            backend=settings.storage_backend,
            local_root=settings.storage_local_root,
            public_base_url=settings.api_public_base_url,
        )
        request.app.state.storage = storage
    return storage


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
Storage = Annotated[ObjectStorage, Depends(get_storage)]