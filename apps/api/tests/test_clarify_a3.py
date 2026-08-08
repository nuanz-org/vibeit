"""A3: clarify parse, answer → forced enums, job status machine."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.clarify_parse import (
    clarify_has_result,
    merge_forced_enums_into_plan,
    normalize_clarify_answers,
    parse_clarify_response,
)
from domain.job_status import (
    IllegalJobTransition,
    assert_job_transition,
    is_job_poll_paused,
    is_terminal_job_status,
)


def test_status_machine_awaiting_clarify() -> None:
    assert_job_transition("queued", "running")
    assert_job_transition("running", "awaiting_clarify")
    assert_job_transition("awaiting_clarify", "queued")
    assert_job_transition("queued", "running")
    assert_job_transition("running", "succeeded")

    try:
        assert_job_transition("awaiting_clarify", "succeeded")
        raise AssertionError("expected IllegalJobTransition")
    except IllegalJobTransition:
        pass

    assert is_terminal_job_status("succeeded")
    assert not is_terminal_job_status("awaiting_clarify")
    assert is_job_poll_paused("awaiting_clarify")
    assert is_job_poll_paused("failed")
    assert not is_job_poll_paused("running")


def test_parse_clarify_response_questions() -> None:
    raw = """
    {
      "understanding": "A kinetic cube logo with switchable variants.",
      "questions": [
        {
          "id": "finalShape",
          "prompt": "Final shape?",
          "options": [
            {"value": "hexagonRing", "label": "Hexagon ring"},
            {"value": "isometricBlock", "label": "Isometric block"},
            {"value": "stackedPyramid", "label": "Pyramid"}
          ],
          "group": "Shape",
          "allowAllOptions": true
        },
        {
          "id": "material",
          "prompt": "Material?",
          "options": [
            {"value": "matte", "label": "Matte"},
            {"value": "glass", "label": "Glass"}
          ]
        }
      ]
    }
    """
    parsed = parse_clarify_response(raw)
    assert "kinetic" in parsed["understanding"].lower() or "cube" in parsed[
        "understanding"
    ].lower()
    assert len(parsed["questions"]) == 2
    assert parsed["questions"][0]["id"] == "finalShape"
    assert len(parsed["questions"][0]["options"]) == 3
    assert parsed["questions"][0]["group"] == "Shape"


def test_parse_clarify_empty_questions() -> None:
    raw = '{"understanding": "Fully specified.", "questions": [], "skipReason": "complete"}'
    parsed = parse_clarify_response(raw)
    assert parsed["questions"] == []
    assert parsed.get("skipReason") == "complete"


def test_all_options_becomes_forced_enum() -> None:
    questions = [
        {
            "id": "finalShape",
            "prompt": "Final shape?",
            "options": [
                {"value": "hexagonRing", "label": "Hexagon"},
                {"value": "isometricBlock", "label": "Isometric"},
                {"value": "stackedPyramid", "label": "Pyramid"},
            ],
            "group": "Shape",
            "allowAllOptions": True,
        }
    ]
    result = normalize_clarify_answers(
        questions=questions,
        answers={"finalShape": {"type": "all_options"}},
        understanding="Cube logo",
    )
    assert len(result["forcedEnums"]) == 1
    fe = result["forcedEnums"][0]
    assert fe["name"] == "finalShape"
    assert len(fe["options"]) == 3
    assert fe["group"] == "Shape"
    assert "all options" in result["transcript"].lower() or "enum" in result[
        "transcript"
    ].lower()


def test_single_choice_still_emits_full_enum() -> None:
    questions = [
        {
            "id": "assemblyStyle",
            "prompt": "Assembly?",
            "options": [
                {"value": "flyIn", "label": "Fly-in"},
                {"value": "scattered", "label": "Scattered"},
            ],
        }
    ]
    result = normalize_clarify_answers(
        questions=questions,
        answers={"assemblyStyle": "scattered"},
    )
    assert len(result["forcedEnums"]) == 1
    assert result["forcedEnums"][0]["default"] == "scattered"
    assert len(result["forcedEnums"][0]["options"]) == 2


def test_merge_forced_enums_into_plan() -> None:
    plan = {
        "concept": "logo",
        "aspect": "1:1",
        "motion": "loop",
        "params": [
            {"name": "bg", "kind": "color", "default": "#000000"},
            {
                "name": "finalShape",
                "kind": "text",
                "default": "wrong",
            },
        ],
        "assetSlots": [],
        "target": "canvas2d",
    }
    forced = [
        {
            "name": "finalShape",
            "label": "Shape",
            "options": [
                {"value": "a", "label": "A"},
                {"value": "b", "label": "B"},
            ],
            "default": "b",
            "group": "Shape",
            "sourceQuestionId": "finalShape",
        },
        {
            "name": "cubeMaterial",
            "label": "Material",
            "options": [
                {"value": "matte", "label": "Matte"},
                {"value": "glass", "label": "Glass"},
            ],
            "default": "matte",
            "sourceQuestionId": "cubeMaterial",
        },
    ]
    merged = merge_forced_enums_into_plan(plan, forced)
    by_name = {p["name"]: p for p in merged["params"]}
    assert by_name["finalShape"]["kind"] == "enum"
    assert by_name["finalShape"]["default"] == "b"
    assert len(by_name["finalShape"]["options"]) == 2
    assert by_name["cubeMaterial"]["kind"] == "enum"
    assert by_name["bg"]["kind"] == "color"


def test_clarify_has_result() -> None:
    assert not clarify_has_result({})
    assert not clarify_has_result(None)
    assert clarify_has_result({"answered": True})
    assert clarify_has_result(
        {"result": {"transcript": "x", "forcedEnums": [], "lockedNotes": []}}
    )


def test_parse_fenced_json() -> None:
    raw = """```json
{"understanding": "ok", "questions": [
  {"id": "mode", "prompt": "Mode?", "options": [
    {"value": "a", "label": "A"},
    {"value": "b", "label": "B"}
  ]}
]}
```"""
    parsed = parse_clarify_response(raw)
    assert len(parsed["questions"]) == 1


if __name__ == "__main__":
    test_status_machine_awaiting_clarify()
    test_parse_clarify_response_questions()
    test_parse_clarify_empty_questions()
    test_all_options_becomes_forced_enum()
    test_single_choice_still_emits_full_enum()
    test_merge_forced_enums_into_plan()
    test_clarify_has_result()
    test_parse_fenced_json()
    print("test_clarify_a3: all passed")
