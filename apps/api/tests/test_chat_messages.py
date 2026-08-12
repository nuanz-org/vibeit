"""Unit tests for job chat message history helpers."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from domain.chat_messages import (
    assistant_clarify_message,
    assistant_error_message,
    assistant_success_message,
    messages_for_wire,
    normalize_message_history,
    user_refine_message,
    user_vision_message,
)


def test_user_vision_message_shape() -> None:
    msg = user_vision_message("  Make a logo  ")
    assert msg["role"] == "user"
    assert msg["content"] == "Make a logo"
    assert msg["kind"] == "vision"
    assert "id" in msg
    assert "createdAt" in msg


def test_normalize_and_wire_history() -> None:
    seed = [user_vision_message("hello"), assistant_success_message()]
    assert len(normalize_message_history(seed)) == 2
    wire = messages_for_wire(seed)
    assert wire[0]["role"] == "user"
    assert wire[1]["kind"] == "success"


def test_wire_falls_back_to_vision_text() -> None:
    wire = messages_for_wire([], vision_text="legacy vision")
    assert len(wire) == 1
    assert wire[0]["content"] == "legacy vision"
    assert wire[0]["kind"] == "vision"


def test_assistant_clarify_and_error() -> None:
    c = assistant_clarify_message(understanding="Got it", question_count=2)
    assert c["role"] == "assistant"
    assert "2 questions" in c["content"]
    e = assistant_error_message(error_message="boom", error_code="INTERNAL")
    assert e["kind"] == "error"
    assert e["meta"]["errorCode"] == "INTERNAL"


def test_refine_message() -> None:
    m = user_refine_message("make it blue")
    assert m["kind"] == "refine"
    assert m["content"] == "make it blue"


if __name__ == "__main__":
    test_user_vision_message_shape()
    test_normalize_and_wire_history()
    test_wire_falls_back_to_vision_text()
    test_assistant_clarify_and_error()
    test_refine_message()
    print("ok")
