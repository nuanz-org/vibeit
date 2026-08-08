"""Model profiles + selectable catalog (Create multi-model)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import httpx

from adapters.llm.openrouter import OpenRouterLLMClient
from adapters.llm.profiles import profile_for_model, reasoning_payload_for_model
from adapters.llm.protocol import ChatMessage, LLMConfigError
from adapters.llm.router import (
    FLASH_MODEL,
    assert_selectable_model,
    public_model_catalog,
    selectable_models,
)


def test_deepseek_profile_disables_reasoning() -> None:
    r = reasoning_payload_for_model("deepseek/deepseek-v4-flash")
    assert r == {"effort": "none"}


def test_gemini_36_profile_enables_reasoning() -> None:
    r = reasoning_payload_for_model("google/gemini-3.6-flash")
    assert r == {"enabled": True}
    p = profile_for_model("google/gemini-3.6-flash")
    assert p.timeout_seconds == 120.0


def test_gemini3_heuristic() -> None:
    r = reasoning_payload_for_model("google/gemini-3-pro-preview")
    assert r == {"enabled": True}


def test_selectable_includes_gemini_and_flash() -> None:
    menu = selectable_models()
    assert FLASH_MODEL in menu
    assert "google/gemini-3.6-flash" in menu


def test_selectable_includes_product_menu_models() -> None:
    menu = selectable_models()
    for mid in (
        "openrouter/fusion",
        "x-ai/grok-4.5",
        "anthropic/claude-sonnet-5",
        "openai/gpt-5.6-luna-pro",
        "moonshotai/kimi-k3",
        "z-ai/glm-5.2",
        "meta/muse-spark-1.2",
    ):
        assert mid in menu
    # Preferred order: product models first, then Flash.
    assert menu.index("openrouter/fusion") < menu.index(FLASH_MODEL)
    assert menu.index("x-ai/grok-4.5") < menu.index(FLASH_MODEL)


def test_new_menu_profiles_reasoning() -> None:
    assert reasoning_payload_for_model("meta/muse-spark-1.2") == {
        "effort": "medium"
    }
    assert reasoning_payload_for_model("moonshotai/kimi-k3") == {"enabled": True}
    assert reasoning_payload_for_model("openai/gpt-5.6-luna-pro") == {
        "enabled": True
    }
    assert reasoning_payload_for_model("x-ai/grok-4.5") == {"enabled": True}
    assert reasoning_payload_for_model("anthropic/claude-sonnet-5") == {
        "enabled": True
    }
    assert reasoning_payload_for_model("z-ai/glm-5.2") == {"enabled": True}
    assert reasoning_payload_for_model("openrouter/fusion") is None
    assert profile_for_model("openrouter/fusion").label == "OpenRouter"


def test_assert_selectable_rejects_unknown() -> None:
    try:
        assert_selectable_model("totally/not-on-menu-xyz")
        raise AssertionError("expected LLMConfigError")
    except LLMConfigError as exc:
        assert "LLM_MODELS_ALLOWED" in str(exc) or "not in" in str(exc)


def test_assert_selectable_accepts_gemini() -> None:
    assert (
        assert_selectable_model("google/gemini-3.6-flash")
        == "google/gemini-3.6-flash"
    )


def test_assert_selectable_accepts_product_models() -> None:
    assert assert_selectable_model("x-ai/grok-4.5") == "x-ai/grok-4.5"
    assert assert_selectable_model("openrouter/fusion") == "openrouter/fusion"


def test_public_catalog_shape() -> None:
    cat = public_model_catalog(default_model=FLASH_MODEL)
    assert "models" in cat
    assert "defaultModel" in cat
    assert cat["defaultModel"] == FLASH_MODEL
    assert any(m["id"] == FLASH_MODEL and m["default"] for m in cat["models"])


def test_env_models_allowed_override() -> None:
    prev = os.environ.get("LLM_MODELS_ALLOWED")
    os.environ["LLM_MODELS_ALLOWED"] = "google/gemini-3.6-flash,deepseek/deepseek-v4-flash"
    try:
        menu = selectable_models()
        assert menu == (
            "google/gemini-3.6-flash",
            "deepseek/deepseek-v4-flash",
        )
        assert_selectable_model("google/gemini-3.6-flash")
    finally:
        if prev is None:
            os.environ.pop("LLM_MODELS_ALLOWED", None)
        else:
            os.environ["LLM_MODELS_ALLOWED"] = prev


def test_openrouter_sends_gemini_reasoning_enabled() -> None:
    async def _run() -> None:
        seen: dict = {}

        def handler(request: httpx.Request) -> httpx.Response:
            import json

            body = json.loads(request.read())
            seen["payload"] = body
            return httpx.Response(
                200,
                json={
                    "id": "gen-g",
                    "model": "google/gemini-3.6-flash",
                    "choices": [
                        {
                            "index": 0,
                            "finish_reason": "stop",
                            "message": {
                                "role": "assistant",
                                "content": "ok",
                            },
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 1,
                        "completion_tokens": 1,
                        "total_tokens": 2,
                    },
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http:
            client = OpenRouterLLMClient(
                api_key="sk-test",
                default_model="google/gemini-3.6-flash",
                client=http,
            )
            result = await client.complete(
                [ChatMessage(role="user", content="hi")],
            )
            assert result.text == "ok"
        assert seen["payload"]["model"] == "google/gemini-3.6-flash"
        assert seen["payload"]["reasoning"] == {"enabled": True}

    import asyncio

    asyncio.run(_run())


def test_openrouter_sends_deepseek_effort_none() -> None:
    async def _run() -> None:
        seen: dict = {}

        def handler(request: httpx.Request) -> httpx.Response:
            import json

            body = json.loads(request.read())
            seen["payload"] = body
            return httpx.Response(
                200,
                json={
                    "id": "gen-d",
                    "model": FLASH_MODEL,
                    "choices": [
                        {
                            "index": 0,
                            "finish_reason": "stop",
                            "message": {"role": "assistant", "content": "ok"},
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 1,
                        "completion_tokens": 1,
                        "total_tokens": 2,
                    },
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http:
            client = OpenRouterLLMClient(
                api_key="sk-test",
                default_model=FLASH_MODEL,
                client=http,
            )
            await client.complete([ChatMessage(role="user", content="hi")])
        assert seen["payload"]["reasoning"] == {"effort": "none"}

    import asyncio

    asyncio.run(_run())


if __name__ == "__main__":
    test_deepseek_profile_disables_reasoning()
    test_gemini_36_profile_enables_reasoning()
    test_gemini3_heuristic()
    test_selectable_includes_gemini_and_flash()
    test_selectable_includes_product_menu_models()
    test_new_menu_profiles_reasoning()
    test_assert_selectable_rejects_unknown()
    test_assert_selectable_accepts_gemini()
    test_assert_selectable_accepts_product_models()
    test_public_catalog_shape()
    test_env_models_allowed_override()
    test_openrouter_sends_gemini_reasoning_enabled()
    test_openrouter_sends_deepseek_effort_none()
    print("LLM profiles OK")
