import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# apps/api/src/core/config.py →
#   parents[2] = apps/api
#   parents[4] = monorepo root (vibeit/)
_API_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = Path(__file__).resolve().parents[4]


def _load_env_files() -> None:
    """
    Load .env into process env before Settings reads os.environ.

    Order: repo root first, then apps/api/.env (api file overrides).
    Does not override variables already set in the shell/process.
    """
    # override=False: existing process env wins (Docker/K8s secrets, CI).
    load_dotenv(_REPO_ROOT / ".env", override=False)
    load_dotenv(_API_ROOT / ".env", override=False)


_load_env_files()


@lru_cache
def get_settings() -> "Settings":
    return Settings()


def _default_storage_root() -> str:
    # apps/api/.data/uploads when running from apps/api; still absolute via resolve
    return str(Path(__file__).resolve().parents[2] / ".data" / "uploads")


class Settings:
    """Minimal settings until pydantic-settings lands with full API stack."""

    def __init__(self) -> None:
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://vibeit:vibeit@localhost:5432/vibeit",
        )
        # Better Auth default session cookie name (signed cookie prefix may apply)
        self.session_cookie_name: str = os.getenv(
            "BETTER_AUTH_SESSION_COOKIE",
            "better-auth.session_token",
        )

        # --- Object storage (M1d) ---
        # local | s3 | r2 | minio  (only local implemented for ASAP)
        self.storage_backend: str = os.getenv("STORAGE_BACKEND", "local")
        self.storage_local_root: str = os.getenv(
            "STORAGE_LOCAL_ROOT",
            _default_storage_root(),
        )
        # Public origin used in get_url() for browser fetches
        self.api_public_base_url: str = os.getenv(
            "API_PUBLIC_BASE_URL",
            "http://localhost:8000",
        ).rstrip("/")
        # Comma-separated web origins allowed for asset CORS (anonymous)
        raw_origins = os.getenv(
            "STORAGE_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
        self.storage_cors_origins: tuple[str, ...] = tuple(
            o.strip() for o in raw_origins.split(",") if o.strip()
        )

        # --- LLM / OpenRouter (M3b) ---
        # ASAP: only deepseek/deepseek-v4-flash (enforced in adapters/llm).
        self.openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.llm_default_model: str = os.getenv(
            "LLM_DEFAULT_MODEL",
            "deepseek/deepseek-v4-flash",
        ).strip()
        # Alias kept for clarity; must match llm_default_model on ASAP path.
        self.llm_codegen_model: str = os.getenv(
            "LLM_CODEGEN_MODEL",
            self.llm_default_model,
        ).strip()
        self.llm_timeout_seconds: float = float(
            os.getenv("LLM_TIMEOUT_SECONDS", "60")
        )
        # Optional OpenRouter rankings headers
        self.llm_http_referer: str = os.getenv(
            "LLM_HTTP_REFERER",
            "http://localhost:3000",
        ).strip()
        self.llm_app_title: str = os.getenv("LLM_APP_TITLE", "Vibeit").strip()

        # --- Create agent budgets (M3e / M3f) ---
        self.create_repair_max: int = int(os.getenv("CREATE_REPAIR_MAX", "3"))
        self.create_wall_time_seconds: float = float(
            os.getenv("CREATE_WALL_TIME_SECONDS", "60")
        )
        # When true, POST /jobs runs agent via BackgroundTasks (M3e default).
        self.create_worker_enabled: bool = os.getenv(
            "CREATE_WORKER_ENABLED", "true"
        ).lower() not in ("0", "false", "no")
        # Daily create quota (M3f) — counts accepted enqueues per UTC day
        self.create_quota_per_day: int = int(os.getenv("CREATE_QUOTA_PER_DAY", "10"))
        # Optional soft token budget stored on the job (not hard-killed mid-stream yet)
        raw_tok = os.getenv("CREATE_TOKEN_BUDGET", "").strip()
        self.create_token_budget: int | None = (
            int(raw_tok) if raw_tok else None
        )
        # Rough cost estimate: integer cents per 1M tokens (default 15 ≈ $0.15/M)
        self.create_cost_cents_per_million_tokens: int = int(
            os.getenv("CREATE_COST_CENTS_PER_MILLION_TOKENS", "15")
        )
