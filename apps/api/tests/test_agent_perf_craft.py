"""Performance craft: neon-trail golden + perf lint anti-patterns."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.golden.index import GOLDEN_MANIFEST, list_goldens, load_golden_source
from agent.golden.retrieve import retrieve_goldens
from agent.prompts.perf_craft import PERF_CRAFT_CANVAS2D
from agent.prompts.create_codegen import codegen_system_prompt
from agent.validators.perf_lint import lint_draw_performance
from agent.validators.static_validate import static_validate_tool_source


def _entry(gid: str):
    return next(e for e in GOLDEN_MANIFEST if e.id == gid)


def test_neon_trail_registered() -> None:
    assert "neon-trail" in set(list_goldens())
    entry = _entry("neon-trail")
    assert "glow" in entry.tags
    assert "trail" in entry.tags
    assert "neon" in entry.tags


def test_neon_trail_static_and_no_perf_issues() -> None:
    src = load_golden_source(_entry("neon-trail"))
    assert "strokeSoftGlow" in src
    assert "fillSoftDisc" in src
    assert "shadowBlur" not in src or "no per-segment" in src.lower()
    # executable source should not assign shadowBlur
    assert ".shadowBlur" not in src
    static = static_validate_tool_source(src, target="canvas2d")
    assert static.ok, static.errors
    assert lint_draw_performance(src) == []


def test_neon_trail_retrieval_for_glow_vision() -> None:
    hits = retrieve_goldens(
        {
            "concept": "glowing infinity neon trail loop mark",
            "tags": ["glow", "trail", "neon", "loop", "logo"],
            "target": "canvas2d",
        },
        limit=2,
    )
    ids = [h.id for h in hits]
    assert "neon-trail" in ids


def test_perf_lint_flags_shadow_blur_in_loop() -> None:
    bad = """
export const createTool = () => createCanvas2dTool({
  getParamSchema: () => [],
  getDefaultParams: () => ({}),
  getAssetSlots: () => [],
  draw(c) {
    const g = c.ctx;
    for (let i = 0; i < 120; i++) {
      g.shadowBlur = 20;
      g.stroke();
    }
  },
}, { aspect: "1:1" });
"""
    issues = lint_draw_performance(bad)
    assert any("shadowBlur" in e for e in issues)
    static = static_validate_tool_source(bad, target="canvas2d")
    assert not static.ok
    assert any("perf:" in e for e in static.errors)


def test_perf_lint_allows_single_shadow_blur() -> None:
    ok = """
export const createTool = () => createCanvas2dTool({
  getParamSchema: () => [],
  getDefaultParams: () => ({}),
  getAssetSlots: () => [],
  draw(c) {
    const g = c.ctx;
    g.shadowBlur = 12;
    g.fillText("hi", 10, 10);
  },
}, { aspect: "1:1" });
"""
    assert lint_draw_performance(ok) == []
    static = static_validate_tool_source(ok, target="canvas2d")
    assert static.ok, static.errors


def test_codegen_prompt_includes_perf_craft() -> None:
    prompt = codegen_system_prompt("canvas2d")
    assert "strokeSoftGlow" in prompt or "shadowBlur" in prompt
    assert "Performance craft" in PERF_CRAFT_CANVAS2D
    assert PERF_CRAFT_CANVAS2D.strip()[:20] in prompt or "Never" in prompt
