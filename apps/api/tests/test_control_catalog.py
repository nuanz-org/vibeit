"""Control Tool Catalog: load, resolve, plan_parse, prompts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.control_catalog.catalog import (
    CONTROL_CATALOG_VERSION,
    active_entries,
    catalog_ids,
    get_entry,
)
from agent.control_catalog.prompt_block import (
    control_catalog_prompt_block,
    inventory_summary_for_codegen,
)
from agent.control_catalog.resolve import (
    ControlInventoryError,
    resolve_control_inventory,
)
from agent.control_catalog.validate import validate_inventory, validate_param_schema
from agent.plan_parse import PlanParseError, normalize_asap_plan, parse_asap_plan
from agent.prompts.create_codegen import codegen_user_prompt
from agent.prompts.create_plan import plan_system_prompt


def test_catalog_has_seed_kinds():
    entries = active_entries()
    assert len(entries) >= 10
    ids = catalog_ids()
    for expected in (
        "number.slider",
        "number.unitInterval",
        "boolean.switch",
        "boolean.playPause",
        "color.hex",
        "text.single",
        "text.textarea",
        "enum.segmented",
        "enum.select",
        "enum.presetGrid",
        "assetRef.image",
    ):
        assert expected in ids
        assert get_entry(expected) is not None
    assert CONTROL_CATALOG_VERSION


def test_resolve_selected_plus_custom():
    inv = {
        "catalogVersion": CONTROL_CATALOG_VERSION,
        "selected": [
            {
                "catalogId": "text.single",
                "name": "titleText",
                "overrides": {
                    "default": "FUCKING",
                    "group": "Text",
                    "label": "Main Text",
                },
            },
            {
                "catalogId": "boolean.playPause",
                "name": "isPlaying",
                "overrides": {"default": True, "group": "Animation"},
            },
            {
                "catalogId": "number.slider",
                "name": "rotX",
                "overrides": {
                    "default": 7,
                    "min": -180,
                    "max": 180,
                    "group": "Rotation",
                },
            },
            {
                "catalogId": "assetRef.image",
                "name": "bgImage",
                "overrides": {"group": "Background", "label": "BG Image"},
            },
        ],
        "skipped": [
            {"catalogId": "enum.presetGrid", "reason": "single palette only"},
        ],
        "custom": [
            {
                "name": "kerningPairs",
                "kind": "text",
                "uiHint": "textarea",
                "default": "K-I:-5",
                "group": "Spacing",
            }
        ],
    }
    out = resolve_control_inventory(inv)
    names = [p["name"] for p in out["params"]]
    assert names == [
        "titleText",
        "isPlaying",
        "rotX",
        "bgImage",
        "kerningPairs",
    ]
    by_name = {p["name"]: p for p in out["params"]}
    assert by_name["titleText"]["default"] == "FUCKING"
    assert by_name["isPlaying"]["uiHint"] == "playPause"
    assert by_name["rotX"]["min"] == -180
    assert by_name["kerningPairs"]["uiHint"] == "textarea"
    assert by_name["bgImage"]["kind"] == "assetRef"
    assert any(s["id"] == "bgImage" for s in out["assetSlots"])
    assert out["controlInventory"]["skipped"]
    assert out["sections"]  # groups present


def test_resolve_unknown_catalog_id_strict():
    inv = {
        "catalogVersion": "1",
        "selected": [{"catalogId": "not.a.real.kind", "name": "x"}],
        "custom": [],
    }
    errs = validate_inventory(inv)
    assert any("unknown catalogId" in e for e in errs)
    try:
        resolve_control_inventory(inv, strict=True)
        raise AssertionError("expected ControlInventoryError")
    except ControlInventoryError:
        pass


def test_resolve_name_collision():
    inv = {
        "selected": [
            {"catalogId": "text.single", "name": "title"},
        ],
        "custom": [
            {"name": "title", "kind": "text", "default": "x"},
        ],
    }
    errs = validate_inventory(inv)
    assert any("duplicate" in e for e in errs)


def test_plan_parse_inventory_authority():
    raw = {
        "concept": "ASCII terminal toy",
        "aspect": "16:9",
        "motion": "ping pong rotation",
        "target": "canvas2d",
        "controlInventory": {
            "catalogVersion": "1",
            "selected": [
                {
                    "catalogId": "text.single",
                    "name": "titleText",
                    "overrides": {"default": "HELLO", "group": "Text"},
                },
                {
                    "catalogId": "color.hex",
                    "name": "fgColor",
                    "overrides": {"default": "#ffffff", "group": "Colors"},
                },
                {
                    "catalogId": "boolean.playPause",
                    "name": "isPlaying",
                    "overrides": {"default": True, "group": "Animation"},
                },
            ],
            "custom": [],
        },
        # Stale params must be ignored when inventory is present
        "params": [
            {"name": "onlyLegacy", "kind": "text", "default": "nope"},
        ],
    }
    plan = normalize_asap_plan(raw)
    names = [p["name"] for p in plan["params"]]
    assert "titleText" in names
    assert "fgColor" in names
    assert "isPlaying" in names
    assert "onlyLegacy" not in names
    assert plan.get("controlInventory")
    assert plan["controlInventory"]["selected"]


def test_plan_parse_legacy_params_still_works():
    plan = normalize_asap_plan(
        {
            "concept": "Simple poster",
            "aspect": "1:1",
            "motion": "still",
            "params": [
                {"name": "bg", "kind": "color", "default": "#111111"},
                {"name": "title", "kind": "text", "default": "Hi"},
                {"name": "speed", "kind": "number", "default": 1, "min": 0, "max": 3},
            ],
            "assetSlots": [],
            "target": "canvas2d",
        }
    )
    assert len(plan["params"]) >= 3
    assert "controlInventory" not in plan


def test_plan_system_prompt_includes_catalog():
    text = plan_system_prompt()
    assert "number.slider" in text
    assert "boolean.playPause" in text
    assert "controlInventory" in text
    assert "Control Tool Catalog" in text


def test_codegen_prompt_includes_inventory_summary():
    plan = {
        "concept": "toy",
        "aspect": "1:1",
        "motion": "loop",
        "target": "canvas2d",
        "params": [
            {"name": "titleText", "kind": "text", "default": "X"},
            {"name": "isPlaying", "kind": "boolean", "default": True},
        ],
        "assetSlots": [],
        "controlInventory": {
            "catalogVersion": "1",
            "selected": [
                {"catalogId": "text.single", "name": "titleText"},
                {"catalogId": "boolean.playPause", "name": "isPlaying"},
            ],
            "custom": [],
        },
    }
    user = codegen_user_prompt(vision_text="cyberpunk terminal", plan=plan)
    assert "titleText←text.single" in user
    assert "isPlaying←boolean.playPause" in user
    summary = inventory_summary_for_codegen(plan)
    assert "selected" in summary


def test_validate_param_schema_enum_default():
    errs = validate_param_schema(
        [
            {
                "name": "mode",
                "kind": "enum",
                "default": "missing",
                "options": [{"value": "a"}, {"value": "b"}],
            }
        ]
    )
    assert any("not in options" in e for e in errs)


def test_prompt_block_compact():
    block = control_catalog_prompt_block(compact=True)
    assert "number.slider" in block
    assert CONTROL_CATALOG_VERSION in block


def test_parse_asap_plan_from_json_string():
    payload = {
        "concept": "Grid tool",
        "aspect": "16:9",
        "motion": "spin",
        "controlInventory": {
            "catalogVersion": "1",
            "selected": [
                {
                    "catalogId": "number.unitInterval",
                    "name": "intensity",
                    "overrides": {"default": 0.8, "group": "Look"},
                },
                {
                    "catalogId": "color.hex",
                    "name": "accent",
                    "overrides": {"default": "#00ffcc", "group": "Look"},
                },
                {
                    "catalogId": "enum.segmented",
                    "name": "mode",
                    "overrides": {
                        "default": "a",
                        "group": "Mode",
                        "options": [
                            {"value": "a", "label": "A"},
                            {"value": "b", "label": "B"},
                        ],
                    },
                },
            ],
            "custom": [],
        },
        "assetSlots": [],
        "target": "canvas2d",
    }
    plan = parse_asap_plan(json.dumps(payload))
    assert plan["params"]
    by = {p["name"]: p for p in plan["params"]}
    assert by["intensity"]["max"] == 1
    assert by["mode"]["kind"] == "enum"
