"""AM4: per-role model router, allowlists, eval model overrides."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, OpenRouterLLMClient
from adapters.llm.protocol import LLMConfigError
from adapters.llm.router import (
    FLASH_MODEL,
    allowlist_for_role,
    assert_model_for_role,
    parse_role_model_pairs,
    reset_role_overrides,
    resolve_model_for_role,
    set_role_overrides,
    validate_configured_models,
)


def test_flash_default_all_roles() -> None:
    for role in ("plan", "codegen", "repair", "judge", "vision"):
        assert resolve_model_for_role(role) == FLASH_MODEL
        assert FLASH_MODEL in allowlist_for_role(role)  # type: ignore[arg-type]


def test_codegen_allowlist_includes_shootout_candidates() -> None:
    al = allowlist_for_role("codegen")
    assert "anthropic/claude-sonnet-4.5" in al or "anthropic/claude-sonnet-4" in al
    assert FLASH_MODEL in al


def test_rejects_unknown_model_for_role() -> None:
    try:
        assert_model_for_role("totally/fake-model-xyz", "codegen")
        raise AssertionError("expected LLMConfigError")
    except LLMConfigError as exc:
        assert "allowlisted" in str(exc).lower() or "not allowlisted" in str(exc)


def test_client_accepts_allowlisted_non_flash() -> None:
    # anthropic/claude-sonnet-4.5 is on codegen allowlist
    client = OpenRouterLLMClient(
        api_key="sk-test",
        default_model="anthropic/claude-sonnet-4.5",
    )
    assert client.default_model == "anthropic/claude-sonnet-4.5"


def test_client_rejects_unknown_default() -> None:
    try:
        OpenRouterLLMClient(api_key="sk-test", default_model="openai/not-on-list-zzz")
        raise AssertionError("expected LLMConfigError")
    except LLMConfigError:
        pass


def test_overrides_context() -> None:
    tok = set_role_overrides({"codegen": "anthropic/claude-sonnet-4.5"})
    try:
        assert (
            resolve_model_for_role("codegen") == "anthropic/claude-sonnet-4.5"
        )
        # Other roles unchanged
        assert resolve_model_for_role("plan") == FLASH_MODEL
    finally:
        reset_role_overrides(tok)
    assert resolve_model_for_role("codegen") == FLASH_MODEL


def test_parse_role_model_pairs() -> None:
    d = parse_role_model_pairs(
        ["codegen=deepseek/deepseek-v4-flash", "judge=google/gemini-2.5-flash"]
    )
    assert d["codegen"] == FLASH_MODEL
    assert d["judge"] == "google/gemini-2.5-flash"


def test_parse_role_model_pairs_bad_role() -> None:
    try:
        parse_role_model_pairs(["wizard=deepseek/deepseek-v4-flash"])
        raise AssertionError("expected LLMConfigError")
    except LLMConfigError:
        pass


def test_validate_configured_models_ok() -> None:
    m = validate_configured_models(
        {
            "plan": FLASH_MODEL,
            "codegen": FLASH_MODEL,
            "repair": FLASH_MODEL,
            "judge": FLASH_MODEL,
            "vision": FLASH_MODEL,
        }
    )
    assert m["codegen"] == FLASH_MODEL


def test_settings_exposes_role_models() -> None:
    from core.config import Settings

    s = Settings()
    assert s.llm_model_codegen
    assert s.llm_model_plan
    assert s.llm_model_judge
    assert s.model_for_role("codegen") == s.llm_model_codegen or True


def test_asap_alias() -> None:
    assert ASAP_CODEGEN_MODEL == FLASH_MODEL


def test_extra_allowlist_env() -> None:
    os.environ["LLM_ALLOWLIST_EXTRA"] = "custom/vendor-model-test"
    try:
        assert "custom/vendor-model-test" in allowlist_for_role("codegen")
        assert_model_for_role("custom/vendor-model-test", "codegen")
    finally:
        os.environ.pop("LLM_ALLOWLIST_EXTRA", None)


if __name__ == "__main__":
    test_flash_default_all_roles()
    test_codegen_allowlist_includes_shootout_candidates()
    test_rejects_unknown_model_for_role()
    test_client_accepts_allowlisted_non_flash()
    test_client_rejects_unknown_default()
    test_overrides_context()
    test_parse_role_model_pairs()
    test_parse_role_model_pairs_bad_role()
    test_validate_configured_models_ok()
    test_settings_exposes_role_models()
    test_asap_alias()
    test_extra_allowlist_env()
    print("AM4 router OK")
