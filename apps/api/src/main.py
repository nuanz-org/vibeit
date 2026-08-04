from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.router import api_v1_router
from core.config import get_settings


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

    yield

    if pool is not None:
        await pool.close()


app = FastAPI(title="Vibeit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/hello")
async def hello():
    return {"message": "Hello from FastAPI"}