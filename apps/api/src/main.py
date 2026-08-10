from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from adapters.storage import create_storage
from api.v1.router import api_v1_router
from core.config import get_settings

# Browser origins that may call the API cross-origin (credentials: include).
# Prefer STORAGE_CORS_ORIGINS / CORS_ORIGINS env; always include local dev hosts.
_DEFAULT_WEB_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


def _cors_allow_origins() -> list[str]:
    settings = get_settings()
    # Reuse storage CORS allowlist so one env covers web + assets.
    from_settings = list(getattr(settings, "storage_cors_origins", ()) or ())
    extras = list(getattr(settings, "cors_origins", ()) or ())
    merged: list[str] = []
    for o in (*from_settings, *extras, *_DEFAULT_WEB_ORIGINS):
        o = (o or "").strip().rstrip("/")
        if o and o not in merged:
            merged.append(o)
    return merged


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    pool = None
    try:
        import asyncpg

        pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5)
        app.state.db_pool = pool
    except Exception as exc:  # pragma: no cover - optional until deps installed
        # API still starts; auth-protected routes fail clearly without a pool.
        print(f"[api] DB pool not available: {exc}")
        app.state.db_pool = None

    try:
        app.state.storage = create_storage(
            backend=settings.storage_backend,
            local_root=settings.storage_local_root,
            public_base_url=settings.api_public_base_url,
        )
        print(
            f"[api] storage backend={settings.storage_backend!r} "
            f"root={settings.storage_local_root!r}"
        )
    except Exception as exc:  # pragma: no cover
        print(f"[api] storage not available: {exc}")
        app.state.storage = None

    print(f"[api] CORS allow_origins={_cors_allow_origins()!r}")

    yield

    if pool is not None:
        await pool.close()


app = FastAPI(title="Aiditr API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI"}