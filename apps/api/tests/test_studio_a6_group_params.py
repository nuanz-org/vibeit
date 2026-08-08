"""A6: pure group-params logic mirrored for CI (Python port of web helper).

Web source of truth: apps/web/features/studio/lib/group-params.ts
This test re-implements the rules so backend CI catches contract drift without
a browser test runner.
"""

from __future__ import annotations

from typing import Any


def _is_hidden(field: dict[str, Any]) -> bool:
    return field.get("uiHint") == "hidden"


def group_params_by_schema(schema: list[dict[str, Any]]) -> list[dict[str, Any]]:
    visible = [f for f in schema if not _is_hidden(f)]
    if not visible:
        return []

    has_any_group = any(
        isinstance(f.get("group"), str) and f["group"].strip() for f in visible
    )

    if not has_any_group:
        colors = [f for f in visible if f.get("kind") == "color"]
        asset_refs = [f for f in visible if f.get("kind") == "assetRef"]
        rest = [
            f
            for f in visible
            if f.get("kind") not in ("color", "assetRef")
        ]
        out: list[dict[str, Any]] = []
        if colors:
            out.append({"id": "legacy-colors", "label": "Colors", "fields": colors})
        if rest:
            out.append({"id": "legacy-params", "label": "Params", "fields": rest})
        if asset_refs:
            out.append(
                {"id": "legacy-assets", "label": "Linked slots", "fields": asset_refs}
            )
        return out

    order: list[str] = []
    buckets: dict[str, list[dict[str, Any]]] = {}
    for field in visible:
        raw = field.get("group")
        label = (
            raw.strip()
            if isinstance(raw, str) and raw.strip()
            else "Params"
        )
        if label not in buckets:
            buckets[label] = []
            order.append(label)
        buckets[label].append(field)

    return [
        {
            "id": f"group-{label.lower().replace(' ', '-')}",
            "label": label,
            "fields": buckets[label],
        }
        for label in order
    ]


def use_segmented_enum(field: dict[str, Any]) -> bool:
    if field.get("kind") != "enum":
        return False
    if field.get("uiHint") == "select":
        return False
    if field.get("uiHint") == "segmented":
        return True
    opts = field.get("options") or []
    return 0 < len(opts) <= 4


def test_legacy_layout_without_groups() -> None:
    schema = [
        {"name": "bg", "kind": "color", "default": "#000"},
        {"name": "speed", "kind": "number", "default": 1},
        {"name": "logo", "kind": "assetRef", "assetSlotId": "logo"},
    ]
    sections = group_params_by_schema(schema)
    assert [s["label"] for s in sections] == ["Colors", "Params", "Linked slots"]
    assert [f["name"] for f in sections[0]["fields"]] == ["bg"]
    assert [f["name"] for f in sections[1]["fields"]] == ["speed"]


def test_group_order_preserves_first_seen() -> None:
    schema = [
        {"name": "headline", "kind": "text", "group": "Content", "default": "Hi"},
        {
            "name": "finalShape",
            "kind": "enum",
            "group": "Shape",
            "default": "a",
            "options": [{"value": "a"}, {"value": "b"}],
            "uiHint": "segmented",
        },
        {"name": "photo", "kind": "assetRef", "group": "Content", "assetSlotId": "photo"},
        {"name": "bg", "kind": "color", "group": "Look", "default": "#111"},
        {"name": "orphan", "kind": "number", "default": 0},  # ungrouped → Params
    ]
    sections = group_params_by_schema(schema)
    labels = [s["label"] for s in sections]
    assert labels == ["Content", "Shape", "Look", "Params"]
    content_names = [f["name"] for f in sections[0]["fields"]]
    assert content_names == ["headline", "photo"]  # co-located assetRef


def test_hidden_fields_skipped() -> None:
    schema = [
        {"name": "cameraState", "kind": "text", "default": "{}", "uiHint": "hidden"},
        {"name": "bg", "kind": "color", "group": "Look", "default": "#000"},
    ]
    sections = group_params_by_schema(schema)
    assert len(sections) == 1
    assert sections[0]["fields"][0]["name"] == "bg"


def test_segmented_rules() -> None:
    small = {
        "kind": "enum",
        "options": [{"value": "a"}, {"value": "b"}, {"value": "c"}],
    }
    assert use_segmented_enum(small)
    forced_select = {**small, "uiHint": "select"}
    assert not use_segmented_enum(forced_select)
    large = {
        "kind": "enum",
        "options": [{"value": str(i)} for i in range(6)],
    }
    assert not use_segmented_enum(large)
    forced_seg = {**large, "uiHint": "segmented"}
    assert use_segmented_enum(forced_seg)


def test_proximity_card_groups() -> None:
    """Mirrors A5 golden group labels for Brik-like panel."""
    schema = [
        {"name": "headline", "kind": "text", "group": "Content"},
        {"name": "maxPixelation", "kind": "number", "group": "Distortion"},
        {"name": "falloff", "kind": "number", "group": "Interaction"},
        {"name": "bg", "kind": "color", "group": "Card Styling"},
    ]
    sections = group_params_by_schema(schema)
    assert [s["label"] for s in sections] == [
        "Content",
        "Distortion",
        "Interaction",
        "Card Styling",
    ]


if __name__ == "__main__":
    test_legacy_layout_without_groups()
    test_group_order_preserves_first_seen()
    test_hidden_fields_skipped()
    test_segmented_rules()
    test_proximity_card_groups()
    print("test_studio_a6_group_params: all passed")
