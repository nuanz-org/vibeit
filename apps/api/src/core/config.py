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
            o.strip().rstrip("/") for o in raw_origins.split(",") if o.strip()
        )
        # Optional extra origins for API CORSMiddleware (credentials include).
        # Falls back to storage list when unset.
        raw_api_cors = os.getenv("CORS_ORIGINS", "").strip()
        if raw_api_cors:
            self.cors_origins: tuple[str, ...] = tuple(
                o.strip().rstrip("/") for o in raw_api_cors.split(",") if o.strip()
            )
        else:
            self.cors_origins = self.storage_cors_origins

        # --- LLM / OpenRouter (M3b + AM4 per-role routing) ---
        # Defaults: deepseek/deepseek-v4-flash per role until A/B decision changes them.
        self.openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "").strip()
        _flash = "deepseek/deepseek-v4-flash"
        self.llm_default_model: str = os.getenv("LLM_DEFAULT_MODEL", _flash).strip()
        # Per-role models (AM4). LLM_MODEL_CODEGEN falls back to legacy LLM_CODEGEN_MODEL.
        self.llm_model_plan: str = os.getenv("LLM_MODEL_PLAN", _flash).strip()
        self.llm_model_codegen: str = (
            os.getenv("LLM_MODEL_CODEGEN", "").strip()
            or os.getenv("LLM_CODEGEN_MODEL", "").strip()
            or self.llm_default_model
            or _flash
        )
        self.llm_model_repair: str = os.getenv(
            "LLM_MODEL_REPAIR", self.llm_model_codegen
        ).strip()
        self.llm_model_judge: str = os.getenv("LLM_MODEL_JUDGE", _flash).strip()
        # Prefer multimodal for AM5 style extract; override via env. Flash remains fallback.
        self.llm_model_vision: str = os.getenv(
            "LLM_MODEL_VISION",
            "google/gemini-2.5-flash",
        ).strip()
        # Back-compat alias
        self.llm_codegen_model: str = self.llm_model_codegen
        self.llm_timeout_seconds: float = float(
            os.getenv("LLM_TIMEOUT_SECONDS", "60")
        )
        # Optional OpenRouter rankings headers
        self.llm_http_referer: str = os.getenv(
            "LLM_HTTP_REFERER",
            "http://localhost:3000",
        ).strip()
        self.llm_app_title: str = os.getenv("LLM_APP_TITLE", "Vibeit").strip()

        # Product Create model menu (user-selectable). Empty env → built-in defaults.
        raw_menu = os.getenv("LLM_MODELS_ALLOWED", "").strip()
        self.llm_models_allowed_raw: str = raw_menu
        # Resolve role models at startup (empty ids fail; any OpenRouter id ok)
        self._validate_llm_role_models()

        # --- Create agent budgets (M3e / M3f / AM2) ---
        self.create_repair_max: int = int(os.getenv("CREATE_REPAIR_MAX", "3"))
        # AM2 host smoke adds ~5–15s per attempt; default raised from 60 → 120
        self.create_wall_time_seconds: float = float(
            os.getenv("CREATE_WALL_TIME_SECONDS", "120")
        )
        self.host_smoke_timeout_seconds: float = float(
            os.getenv("VIBEIT_HOST_SMOKE_TIMEOUT_SECONDS", "45")
        )
        self.smoke_min_variance: float = float(
            os.getenv("VIBEIT_SMOKE_MIN_VARIANCE", "5")
        )
        # AM3 critic — advisory until VIBEIT_CRITIC_ENFORCED after calibration
        self.critic_threshold: float = float(
            os.getenv("VIBEIT_CRITIC_THRESHOLD", "3.5")
        )
        self.critic_enforced: bool = os.getenv(
            "VIBEIT_CRITIC_ENFORCED", ""
        ).lower() in ("1", "true", "yes", "on")
        # AM6 multi-target (config-gated; canvas2d always on)
        self.target_p5_enabled: bool = os.getenv(
            "VIBEIT_TARGET_P5_ENABLED", ""
        ).lower() in ("1", "true", "yes", "on")
        self.target_three_enabled: bool = os.getenv(
            "VIBEIT_TARGET_THREE_ENABLED", ""
        ).lower() in ("1", "true", "yes", "on")
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

        # --- AM7 Control refine budgets ---
        # Max refine enqueues per tool within the rolling window
        self.refine_budget_per_tool: int = int(
            os.getenv("VIBEIT_REFINE_BUDGET_PER_TOOL", "20")
        )
        self.refine_budget_window_hours: int = int(
            os.getenv("VIBEIT_REFINE_BUDGET_WINDOW_HOURS", "24")
        )
        self.refine_wall_time_seconds: float = float(
            os.getenv(
                "VIBEIT_REFINE_WALL_TIME_SECONDS",
                str(self.create_wall_time_seconds),
            )
        )

    def _validate_llm_role_models(self) -> None:
        """AM4: empty LLM_MODEL_* fails at Settings construction; any model id ok."""
        from adapters.llm.router import validate_configured_models

        validate_configured_models(
            {
                "plan": self.llm_model_plan,
                "codegen": self.llm_model_codegen,
                "repair": self.llm_model_repair,
                "judge": self.llm_model_judge,
                "vision": self.llm_model_vision,
            }
        )

    def model_for_role(self, role: str) -> str:
        """Resolve model for an agent role (respects eval overrides)."""
        from adapters.llm.router import resolve_model_for_role

        key = f"llm_model_{role}"
        configured = getattr(self, key, None)
        return resolve_model_for_role(
            role,  # type: ignore[arg-type]
            configured=configured if isinstance(configured, str) else None,
        )

    def llm_model_catalog(self) -> dict:
        """Create UI catalog: allowed models + default."""
        from adapters.llm.router import public_model_catalog

        return public_model_catalog(default_model=self.llm_model_codegen)
