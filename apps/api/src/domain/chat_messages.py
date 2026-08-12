"""
Job chat message history helpers.

Stored on generation_jobs.message_history as an ordered JSON array.
Wire format is camelCase (matches Job API contracts).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

ChatRole = Literal["user", "assistant"]
ChatMessageKind = Literal[
    "vision",
    "refine",
    "clarify",
    "clarify_answers",
    "status",
    "error",
    "success",
]


def _utc_iso(dt: datetime | None = None) -> str:
    if dt is None:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def make_chat_message(
    *,
    role: ChatRole,
    content: str,
    kind: ChatMessageKind | str | None = None,
    meta: dict[str, Any] | None = None,
    message_id: str | None = None,
    created_at: datetime | None = None,
) -> dict[str, Any]:
    """Build one history entry (camelCase keys for storage + wire)."""
    text = (content or "").strip()
    msg: dict[str, Any] = {
        "id": message_id or str(uuid4()),
        "role": role,
        "content": text,
        "createdAt": _utc_iso(created_at),
    }
    if kind:
        msg["kind"] = kind
    if meta:
        msg["meta"] = meta
    return msg


def user_vision_message(vision_text: str) -> dict[str, Any]:
    return make_chat_message(
        role="user",
        content=vision_text,
        kind="vision",
    )


def user_refine_message(
    chat_message: str,
    *,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return make_chat_message(
        role="user",
        content=chat_message,
        kind="refine",
        meta=meta,
    )


def assistant_clarify_message(
    *,
    understanding: str | None,
    question_count: int,
) -> dict[str, Any]:
    parts: list[str] = []
    u = (understanding or "").strip()
    if u:
        parts.append(u)
    if question_count > 0:
        parts.append(
            f"I have {question_count} question"
            f"{'s' if question_count != 1 else ''} before building."
        )
    content = "\n\n".join(parts) if parts else "A few questions before we build."
    return make_chat_message(
        role="assistant",
        content=content,
        kind="clarify",
        meta={"questionCount": question_count},
    )


def user_clarify_answers_message(
    *,
    transcript: str | None,
    summary: str | None = None,
) -> dict[str, Any]:
    text = (summary or "").strip() or (transcript or "").strip() or "Answers submitted."
    return make_chat_message(
        role="user",
        content=text,
        kind="clarify_answers",
    )


def assistant_success_message(*, job_kind: str = "create") -> dict[str, Any]:
    if job_kind == "refine":
        content = "Refine applied — new version ready."
    else:
        content = "Tool ready — opening Studio."
    return make_chat_message(
        role="assistant",
        content=content,
        kind="success",
    )


def assistant_refine_message(
    content: str,
    *,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Capability-agent refine result shown in Studio continuous chat."""
    text = (content or "").strip() or "Refine applied — new version ready."
    return make_chat_message(
        role="assistant",
        content=text[:4000],
        kind="refine_result",
        meta=meta,
    )


def truncate_chat_history(
    history: list[Any] | None,
    *,
    max_turns: int = 40,
) -> list[dict[str, Any]]:
    """Keep the last max_turns well-formed message dicts."""
    if not isinstance(history, list) or max_turns <= 0:
        return []
    out: list[dict[str, Any]] = []
    for item in history:
        if isinstance(item, dict) and item.get("role") and item.get("content") is not None:
            out.append(item)
    if len(out) > max_turns:
        return out[-max_turns:]
    return out


def assistant_error_message(
    *,
    error_message: str | None,
    error_code: str | None = None,
) -> dict[str, Any]:
    content = (error_message or "Generation failed").strip()
    meta: dict[str, Any] = {}
    if error_code:
        meta["errorCode"] = error_code
    return make_chat_message(
        role="assistant",
        content=content[:2000],
        kind="error",
        meta=meta or None,
    )


def assistant_status_message(content: str, *, phase: str | None = None) -> dict[str, Any]:
    meta = {"phase": phase} if phase else None
    return make_chat_message(
        role="assistant",
        content=content,
        kind="status",
        meta=meta,
    )


def normalize_message_history(raw: Any) -> list[dict[str, Any]]:
    """Coerce DB value to a list of message dicts."""
    if raw is None:
        return []
    if isinstance(raw, str):
        import json

        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant"):
            continue
        if not isinstance(content, str):
            continue
        msg: dict[str, Any] = {
            "id": str(item.get("id") or uuid4()),
            "role": role,
            "content": content,
            "createdAt": str(item.get("createdAt") or item.get("created_at") or _utc_iso()),
        }
        kind = item.get("kind")
        if isinstance(kind, str) and kind:
            msg["kind"] = kind
        meta = item.get("meta")
        if isinstance(meta, dict) and meta:
            msg["meta"] = meta
        out.append(msg)
    return out


def messages_for_wire(raw: Any, *, vision_text: str | None = None) -> list[dict[str, Any]]:
    """
    History for JobStatusResponse.

    Falls back to a single user vision message when history is empty
    (pre-migration jobs still have vision_text).
    """
    history = normalize_message_history(raw)
    if history:
        return history
    vision = (vision_text or "").strip()
    if vision:
        return [user_vision_message(vision)]
    return []
