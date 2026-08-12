"""Unit tests for capability refine ops (controllers + values)."""

from __future__ import annotations

import pytest

from services.refine_ops import (
    RefineOpError,
    apply_capability_ops,
    apply_update_param_meta,
    apply_update_param_value,
    parse_capability_plan,
    sync_param_bounds_in_code,
)


SAMPLE_CODE = '''
export const createTool = () =>
  createCanvas2dTool(
    {
      getParamSchema: () => [
        {
          name: "itemSpacing",
          kind: "number",
          uiHint: "slider",
          label: "Card Spacing",
          default: 103,
          min: 40,
          max: 200,
          step: 1,
          group: "Layout & Geometry",
        },
      ],
      getDefaultParams: () => ({
        itemSpacing: 103,
      }),
      draw(c) {},
    },
    { aspect: "4:5", autoDpr: true }
  );
'''


def test_sync_param_bounds_raises_max():
    code, changed = sync_param_bounds_in_code(
        SAMPLE_CODE,
        name="itemSpacing",
        updates={"max": 500},
    )
    assert changed is True
    assert "max: 500" in code
    assert "max: 200" not in code


def test_update_param_meta_max_500():
    schema = [
        {
            "name": "itemSpacing",
            "kind": "number",
            "default": 103,
            "min": 40,
            "max": 200,
        }
    ]
    out = apply_update_param_meta(
        param_schema=schema,
        default_params={"itemSpacing": 103},
        code=SAMPLE_CODE,
        op={"op": "update_param_meta", "name": "itemSpacing", "max": 500},
    )
    assert out["changed"] is True
    entry = next(p for p in out["param_schema"] if p["name"] == "itemSpacing")
    assert entry["max"] == 500
    assert "max: 500" in out["code"]


def test_update_param_value_rejects_above_max():
    schema = [
        {
            "name": "itemSpacing",
            "kind": "number",
            "default": 103,
            "min": 40,
            "max": 200,
        }
    ]
    with pytest.raises(RefineOpError, match="above max"):
        apply_update_param_value(
            draft_params={"itemSpacing": 200},
            param_schema=schema,
            default_params={"itemSpacing": 103},
            op={"op": "update_param_value", "name": "itemSpacing", "value": 500},
        )


def test_capability_ops_meta_then_value():
    schema = [
        {
            "name": "itemSpacing",
            "kind": "number",
            "default": 103,
            "min": 40,
            "max": 200,
        }
    ]
    out = apply_capability_ops(
        ops=[
            {"op": "update_param_meta", "name": "itemSpacing", "max": 500},
            {"op": "update_param_value", "name": "itemSpacing", "value": 500},
        ],
        code=SAMPLE_CODE,
        param_schema=schema,
        default_params={"itemSpacing": 103},
        draft_params={"itemSpacing": 200},
    )
    assert out["changed"] is True
    assert out["needs_version"] is True
    assert out["draft_params"]["itemSpacing"] == 500
    entry = next(p for p in out["param_schema"] if p["name"] == "itemSpacing")
    assert entry["max"] == 500
    assert "max: 500" in out["code"]


def test_parse_capability_plan():
    plan = parse_capability_plan(
        '{"ops":[{"op":"update_param_meta","name":"itemSpacing","max":500}],'
        '"explain":"Raised max to 500."}'
    )
    assert len(plan["ops"]) == 1
    assert "500" in plan["explain"]


def test_empty_ops_apply_raises():
    with pytest.raises(RefineOpError):
        apply_capability_ops(
            ops=[],
            code=SAMPLE_CODE,
            param_schema=[],
            default_params={},
            draft_params={},
        )


def test_brik_normalize_value_above_max_injects_meta():
    """Brik pattern: value past max auto-raises max before apply."""
    from services.refine_ops import normalize_ops_brik_style

    schema = [
        {
            "name": "galleryArc",
            "kind": "number",
            "label": "Gallery Arc",
            "default": 600,
            "min": 0,
            "max": 600,
        }
    ]
    ops = normalize_ops_brik_style(
        [{"op": "update_param_value", "name": "galleryArc", "value": 3000}],
        param_schema=schema,
    )
    assert ops[0]["op"] == "update_param_meta"
    assert ops[0]["max"] == 3000
    assert ops[1]["op"] == "update_param_value"
    assert ops[1]["value"] == 3000

    arc_code = '''
      getParamSchema: () => [
        {
          name: "galleryArc",
          kind: "number",
          label: "Gallery Arc",
          default: 600,
          min: 0,
          max: 600,
          step: 1,
        },
      ],
      getDefaultParams: () => ({
        galleryArc: 600,
      }),
'''
    out = apply_capability_ops(
        ops=[{"op": "update_param_value", "name": "galleryArc", "value": 3000}],
        code=arc_code,
        param_schema=schema,
        default_params={"galleryArc": 600},
        draft_params={"galleryArc": 600},
    )
    entry = next(p for p in out["param_schema"] if p["name"] == "galleryArc")
    assert entry["max"] == 3000
    assert out["draft_params"]["galleryArc"] == 3000
    assert "Gallery Arc" in out["explain"]
    assert "3000" in out["explain"]


def test_brik_explain_range_only():
    from services.refine_ops import build_brik_style_explain

    text = build_brik_style_explain(
        ops_applied=[
            {
                "op": "update_param_meta",
                "name": "galleryArc",
                "max": 3000,
                "min": -1000,
            }
        ],
        param_schema=[
            {
                "name": "galleryArc",
                "label": "Gallery Arc",
                "kind": "number",
                "max": 3000,
                "min": -1000,
            }
        ],
    )
    assert "Gallery Arc" in text
    assert "3000" in text
    assert "Adjust" in text or "adjust" in text.lower() or "panel" in text.lower() or "control" in text.lower()
