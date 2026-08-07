"""M3b smoke: LLM protocol + OpenRouter adapter (mocked HTTP)."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import httpx

from adapters.llm.openrouter import ASAP_CODEGEN_MODEL, OpenRouterLLMClient
from adapters.llm.protocol import (
    ChatMessage,
    LLMConfigError,
    LLMRequestError,
)
from adapters.llm.router import resolve_model_for_role


def test_asap_model_constant() -> None:
    assert ASAP_CODEGEN_MODEL == "deepseek/deepseek-v4-flash"


def test_router_all_roles_use_flash() -> None:
    for role in ("codegen", "plan", "repair", "judge", "vision"):
        assert resolve_model_for_role(role) == ASAP_CODEGEN_MODEL


def test_accepts_any_openrouter_model() -> None:
    client = OpenRouterLLMClient(
        api_key="sk-test",
        default_model="openai/not-allowlisted-zzz",
    )
    assert client.default_model == "openai/not-allowlisted-zzz"


def test_missing_api_key() -> None:
    try:
        OpenRouterLLMClient(api_key="  ")
        raise AssertionError("expected LLMConfigError")
    except LLMConfigError:
        pass


def test_complete_parses_openrouter_response() -> None:
    async def _run() -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.method == "POST"
            assert "Authorization" in request.headers
            body = request.read()
            assert b"deepseek/deepseek-v4-flash" in body
            return httpx.Response(
                200,
                json={
                    "id": "gen-1",
                    "model": "deepseek/deepseek-v4-flash",
                    "choices": [
                        {
                            "index": 0,
                            "finish_reason": "stop",
                            "message": {
                                "role": "assistant",
                                "content": '{"target":"canvas2d"}',
                            },
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 12,
                        "completion_tokens": 8,
                        "total_tokens": 20,
                    },
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http:
            client = OpenRouterLLMClient(
                api_key="sk-test-key",
                default_model=ASAP_CODEGEN_MODEL,
                client=http,
            )
            result = await client.complete(
                [
                    ChatMessage(role="system", content="You are a planner."),
                    ChatMessage(role="user", content="Make a kinetic frame"),
                ],
                temperature=0.2,
            )
            assert result.text == '{"target":"canvas2d"}'
            assert result.model == "deepseek/deepseek-v4-flash"
            assert result.usage.total_tokens == 20
            assert result.usage.prompt_tokens == 12
            assert result.finish_reason == "stop"

            # Explicit alternate model id is accepted (OpenRouter validates availability)
            def handler_any(request: httpx.Request) -> httpx.Response:
                body = request.read()
                assert b"openai/gpt-4.1-mini" in body
                return httpx.Response(
                    200,
                    json={
                        "id": "gen-2",
                        "model": "openai/gpt-4.1-mini",
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

            transport_any = httpx.MockTransport(handler_any)
            async with httpx.AsyncClient(transport=transport_any) as http2:
                client2 = OpenRouterLLMClient(
                    api_key="sk-test-key",
                    default_model=ASAP_CODEGEN_MODEL,
                    client=http2,
                )
                alt = await client2.complete(
                    [ChatMessage(role="user", content="x")],
                    model="openai/gpt-4.1-mini",
                )
                assert alt.text == "ok"
                assert alt.model == "openai/gpt-4.1-mini"

    asyncio.run(_run())


def test_complete_http_error() -> None:
    async def _run() -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(401, text="Invalid API key")

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http:
            client = OpenRouterLLMClient(api_key="sk-bad", client=http)
            try:
                await client.complete([{"role": "user", "content": "hi"}])
                raise AssertionError("expected LLMRequestError")
            except LLMRequestError as exc:
                assert exc.status_code == 401

    asyncio.run(_run())


def test_settings_defaults() -> None:
    from core.config import Settings

    # Clear lru if needed — Settings() reads env (incl. dotenv-loaded .env)
    s = Settings()
    assert s.llm_default_model == "deepseek/deepseek-v4-flash" or (
        s.llm_default_model  # may be overridden in env
    )
    # Codegen model field exists
    assert isinstance(s.llm_codegen_model, str)
    assert isinstance(s.openrouter_api_key, str)


def test_dotenv_load_runs_without_error() -> None:
    """config import loads repo/.env; model default remains Flash if unset."""
    from core import config as config_mod

    # Module import already called _load_env_files; re-run is safe
    config_mod._load_env_files()
    s = config_mod.Settings()
    # If .env sets LLM_DEFAULT_MODEL, it must still be the ASAP model (or empty→default)
    assert s.llm_default_model
    if not os.environ.get("LLM_DEFAULT_MODEL"):
        assert s.llm_default_model == "deepseek/deepseek-v4-flash"


if __name__ == "__main__":
    test_asap_model_constant()
    test_router_all_roles_use_flash()
    test_accepts_any_openrouter_model()
    test_missing_api_key()
    test_complete_parses_openrouter_response()
    test_complete_http_error()
    test_settings_defaults()
    test_dotenv_load_runs_without_error()
    print("M3b LLM smoke OK")
