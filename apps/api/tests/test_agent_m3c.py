"""M3c: agent scaffold, static validate, structural sandbox smoke, LangGraph fixture path."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.fixtures import load_fixture_source
from agent.graphs.create import run_create_fixture_pipeline
from agent.validators.sandbox_smoke import run_structural_smoke
from agent.validators.static_validate import static_validate_tool_source

_BROKEN_EVAL = """
export function createTool() {
  eval("alert(1)");
  return {
    mount() {},
    update() {},
    captureFrame() { return new Blob(); },
    dispose() {},
    getParamSchema() { return []; },
    getDefaultParams() { return {}; },
    getAssetSlots() { return []; },
  };
}
"""

_BROKEN_PARENT = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [],
    getDefaultParams: () => ({}),
    getAssetSlots: () => [],
    draw(c) {
      window.parent.postMessage("breakout", "*");
      c.ctx.fillRect(0, 0, 10, 10);
    },
  });
"""

_MINIMAL_OK = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#000" }],
    getDefaultParams: () => ({ bg: "#000" }),
    getAssetSlots: () => [],
    draw(c) {
      c.ctx.fillStyle = String(c.params.bg ?? "#000");
      c.ctx.fillRect(0, 0, c.width, c.height);
      c.ctx.fillStyle = "#fff";
      c.ctx.fillText("ok", 10, 20);
    },
  });
"""


def test_load_social_frame_fixture() -> None:
    code = load_fixture_source("social-frame")
    assert "createSocialFrameTool" in code
    assert "createCanvas2dTool" in code
    assert len(code) > 500


def test_static_validate_fixture_passes() -> None:
    code = load_fixture_source("social-frame")
    result = static_validate_tool_source(code)
    assert result.ok, result.errors


def test_static_validate_rejects_eval() -> None:
    result = static_validate_tool_source(_BROKEN_EVAL)
    assert not result.ok
    assert any("eval" in e for e in result.errors)


def test_static_validate_rejects_parent() -> None:
    result = static_validate_tool_source(_BROKEN_PARENT)
    assert not result.ok
    assert any("parent" in e or "window" in e for e in result.errors)


def test_static_validate_empty() -> None:
    result = static_validate_tool_source("   ")
    assert not result.ok


def test_sandbox_smoke_fixture_passes() -> None:
    # M3c unit surface is structural pre-filter; full host smoke is AM2.
    code = load_fixture_source("social-frame")
    result = run_structural_smoke(code)
    assert result.ok, result.errors
    assert result.mode == "structural"


def test_sandbox_smoke_minimal_ok() -> None:
    result = run_structural_smoke(_MINIMAL_OK)
    assert result.ok, result.errors


def test_sandbox_smoke_rejects_broken() -> None:
    result = run_structural_smoke(_BROKEN_EVAL)
    assert not result.ok


def test_langgraph_fixture_pipeline_passes() -> None:
    out = run_create_fixture_pipeline(
        vision_text="A kinetic social frame",
        fixture_name="social-frame",
    )
    assert out.get("vision_text")
    assert out.get("target") == "canvas2d"
    assert out.get("validate_ok") is True, out.get("validation_errors")
    assert out.get("smoke_ok") is True, out.get("smoke_errors")
    assert out.get("ready_for_finalize") is True
    assert out.get("error_code") in (None, "")
    assert "createSocialFrameTool" in (out.get("code") or "")


def test_langgraph_empty_vision_fails() -> None:
    out = run_create_fixture_pipeline(vision_text="   ")
    assert out.get("error_code") == "VALIDATION_FAILED"
    assert out.get("ready_for_finalize") is not True


def test_langgraph_injected_broken_code_fails() -> None:
    out = run_create_fixture_pipeline(
        vision_text="test",
        code=_BROKEN_PARENT,
    )
    assert out.get("validate_ok") is False or out.get("smoke_ok") is False
    assert out.get("ready_for_finalize") is not True


if __name__ == "__main__":
    test_load_social_frame_fixture()
    test_static_validate_fixture_passes()
    test_static_validate_rejects_eval()
    test_static_validate_rejects_parent()
    test_static_validate_empty()
    test_sandbox_smoke_fixture_passes()
    test_sandbox_smoke_minimal_ok()
    test_sandbox_smoke_rejects_broken()
    test_langgraph_fixture_pipeline_passes()
    test_langgraph_empty_vision_fails()
    test_langgraph_injected_broken_code_fails()
    print("M3c agent smoke OK")
