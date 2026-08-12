"""
Build continuous-refine context pack for the capability agent.
"""

from __future__ import annotations

from typing import Any

from adapters.db.types import ToolRow, ToolVersionRow
from domain.chat_messages import truncate_chat_history


def _as_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return list(value) if isinstance(value, list) else []


def build_refine_context_pack(
    *,
    tool: ToolRow,
    version: ToolVersionRow,
    user_message: str,
    client_params: dict[str, Any] | None = None,
    chat_history_limit: int = 20,
    include_code: bool = True,
    code_max_chars: int = 48_000,
) -> dict[str, Any]:
    """
    Snapshot for one Studio refine turn.

    Prefer client_params (live sliders) over draft when provided.
    """
    defaults = _as_dict(version.default_params)
    draft = _as_dict(tool.draft_params)
    live = dict(defaults)
    live.update(draft)
    if isinstance(client_params, dict) and client_params:
        live.update(client_params)
        draft_for_agent = dict(draft)
        draft_for_agent.update(client_params)
    else:
        draft_for_agent = draft

    schema = _as_list(version.param_schema)
    history = truncate_chat_history(
        tool.chat_history if isinstance(tool.chat_history, list) else [],
        max_turns=chat_history_limit,
    )

    code = version.code or ""
    code_out = code
    if include_code and len(code) > code_max_chars:
        code_out = code[:code_max_chars] + "\n/* … truncated … */"

    param_names = [
        str(p.get("name"))
        for p in schema
        if isinstance(p, dict) and p.get("name") is not None
    ]

    return {
        "userMessage": (user_message or "").strip(),
        "chatHistory": history,
        "paramSchema": schema,
        "paramNames": param_names,
        "defaultParams": defaults,
        "draftParams": draft_for_agent,
        "effectiveParams": live,
        "assetSlots": _as_list(version.asset_slots),
        "draftAssets": _as_dict(tool.draft_assets),
        "target": version.target or "canvas2d",
        "baseVersionId": str(version.id),
        "toolId": str(tool.id),
        "code": code_out if include_code else "",
        "codeDigest": {
            "length": len(code),
            "paramNames": param_names,
            "target": version.target or "canvas2d",
        },
    }
