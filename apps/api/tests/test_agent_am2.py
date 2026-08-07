"""AM2: esbuild compile gate, param coverage, Playwright host smoke."""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.fixtures import load_fixture_source
from agent.graphs.create import run_create_fixture_pipeline
from agent.validators.compile_check import run_compile_check
from agent.validators.host_smoke import run_host_smoke
from agent.validators.param_coverage import run_param_coverage
from agent.validators.sandbox_smoke import run_sandbox_smoke, run_structural_smoke

_MINIMAL_OK = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [
      { name: "bg", kind: "color", default: "#112233" },
      { name: "title", kind: "text", default: "Hello" },
    ],
    getDefaultParams: () => ({ bg: "#112233", title: "Hello" }),
    getAssetSlots: () => [],
    draw(c) {
      c.ctx.fillStyle = String(c.params.bg ?? "#112233");
      c.ctx.fillRect(0, 0, c.width, c.height);
      c.ctx.fillStyle = "#ffffff";
      c.ctx.font = "bold 48px system-ui, sans-serif";
      c.ctx.fillText(String(c.params.title ?? "Hello"), 40, c.height / 2);
      // secondary shape so variance is clearly non-zero
      c.ctx.fillStyle = "#ff4d6d";
      c.ctx.beginPath();
      c.ctx.arc(c.width * 0.75, c.height * 0.35, 40, 0, Math.PI * 2);
      c.ctx.fill();
    },
  }, { aspect: "1:1", autoDpr: true });
"""

_TS_BROKEN = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#000" }],
    getDefaultParams: () => ({ bg: "#000" }),
    getAssetSlots: () => [],
    draw(c) {
      // deliberate TypeScript/syntax break
      const x: number = "not-a-number";
      c.ctx.fillRect(0, 0, c.width, c.height
    },
  });
"""

_RUNTIME_THROW = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#000" }],
    getDefaultParams: () => ({ bg: "#000" }),
    getAssetSlots: () => [],
    draw(c) {
      throw new Error("deliberate runtime boom");
    },
  }, { aspect: "1:1", autoDpr: true });
"""

_BLANK_CANVAS = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#000000" }],
    getDefaultParams: () => ({ bg: "#000000" }),
    getAssetSlots: () => [],
    draw(c) {
      // clear only — near-zero variance (solid black, no marks)
      c.ctx.clearRect(0, 0, c.width, c.height);
      c.ctx.fillStyle = "#000000";
      c.ctx.fillRect(0, 0, c.width, c.height);
    },
  }, { aspect: "1:1", autoDpr: true });
"""

_MISSING_PARAM = """
import { createCanvas2dTool } from "@repo/contracts/skeletons/canvas2d";

export const createTool = () =>
  createCanvas2dTool({
    getParamSchema: () => [{ name: "bg", kind: "color", default: "#111" }],
    getDefaultParams: () => ({ bg: "#111" }),
    getAssetSlots: () => [],
    draw(c) {
      c.ctx.fillStyle = "#111";
      c.ctx.fillRect(0, 0, c.width, c.height);
      c.ctx.fillStyle = "#fff";
      c.ctx.fillText("hi", 20, 40);
    },
  }, { aspect: "1:1", autoDpr: true });
"""


def test_compile_minimal_ok() -> None:
    result = run_compile_check(_MINIMAL_OK)
    assert result.ok, result.errors
    assert result.js and "createTool" in result.js


def test_compile_fixture_ok() -> None:
    code = load_fixture_source("social-frame")
    result = run_compile_check(code)
    assert result.ok, result.errors
    assert result.js and len(result.js) > 100


def test_compile_rejects_syntax() -> None:
    result = run_compile_check(_TS_BROKEN)
    assert not result.ok
    assert any("compile:" in e for e in result.errors)


def test_compile_rejects_empty() -> None:
    result = run_compile_check("   ")
    assert not result.ok


def test_param_coverage_ok() -> None:
    plan = {
        "params": [
            {"name": "bg", "kind": "color"},
            {"name": "title", "kind": "text"},
        ]
    }
    result = run_param_coverage(_MINIMAL_OK, plan)
    assert result.ok, result.errors


def test_param_coverage_missing() -> None:
    plan = {
        "params": [
            {"name": "bg", "kind": "color"},
            {"name": "accent", "kind": "color"},
            {"name": "title", "kind": "text"},
        ]
    }
    result = run_param_coverage(_MISSING_PARAM, plan)
    assert not result.ok
    assert "accent" in result.missing
    assert "title" in result.missing
    assert "bg" not in result.missing


def test_param_coverage_no_plan() -> None:
    result = run_param_coverage(_MINIMAL_OK, None)
    assert result.ok


def test_structural_still_cheap() -> None:
    result = run_structural_smoke(_MINIMAL_OK)
    assert result.ok
    assert result.mode == "structural"


def test_full_smoke_minimal() -> None:
    result = run_sandbox_smoke(
        _MINIMAL_OK,
        plan={
            "params": [
                {"name": "bg", "kind": "color"},
                {"name": "title", "kind": "text"},
            ]
        },
        job_id="am2-test-minimal",
    )
    assert result.ok, result.errors
    assert result.compiled_js
    assert result.screenshot_path
    assert Path(result.screenshot_path).is_file()
    assert result.variance is not None and result.variance >= 5
    assert "host" in result.stages_run


def test_full_smoke_rejects_runtime_throw() -> None:
    # Passes structural + compile; fails host
    structural = run_structural_smoke(_RUNTIME_THROW)
    assert structural.ok, structural.errors
    compile_r = run_compile_check(_RUNTIME_THROW)
    assert compile_r.ok, compile_r.errors

    result = run_sandbox_smoke(_RUNTIME_THROW, job_id="am2-test-throw")
    assert not result.ok
    assert any("host_smoke" in e or "boom" in e.lower() or "TOOL" in e for e in result.errors)


def test_full_smoke_rejects_blank() -> None:
    compile_r = run_compile_check(_BLANK_CANVAS)
    assert compile_r.ok, compile_r.errors
    # Host-only with low variance floor still rejects solid black? solid black variance ~0
    host = run_host_smoke(compile_r.js or "", job_id="am2-test-blank", min_variance=5.0)
    assert not host.ok
    assert any("blank" in e.lower() or "variance" in e.lower() for e in host.errors)


def test_full_smoke_rejects_missing_param() -> None:
    plan = {
        "params": [
            {"name": "bg", "kind": "color"},
            {"name": "accent", "kind": "color"},
        ]
    }
    result = run_sandbox_smoke(
        _MISSING_PARAM,
        plan=plan,
        stages=("structural", "compile", "param_coverage"),
    )
    assert not result.ok
    assert any("param_coverage" in e for e in result.errors)


def test_fixture_pipeline_full_smoke() -> None:
    out = run_create_fixture_pipeline(
        vision_text="A kinetic social frame",
        fixture_name="social-frame",
    )
    assert out.get("validate_ok") is True, out.get("validation_errors")
    assert out.get("smoke_ok") is True, out.get("smoke_errors")
    assert out.get("ready_for_finalize") is True
    assert out.get("phase") in ("smoke:host", "smoke", "finalize")
    assert out.get("smoke_screenshot_path")


def test_injected_runtime_throw_fails_pipeline() -> None:
    out = run_create_fixture_pipeline(
        vision_text="test",
        code=_RUNTIME_THROW,
    )
    assert out.get("smoke_ok") is False
    assert out.get("ready_for_finalize") is not True


if __name__ == "__main__":
    test_compile_minimal_ok()
    test_compile_fixture_ok()
    test_compile_rejects_syntax()
    test_compile_rejects_empty()
    test_param_coverage_ok()
    test_param_coverage_missing()
    test_param_coverage_no_plan()
    test_structural_still_cheap()
    test_full_smoke_minimal()
    test_full_smoke_rejects_runtime_throw()
    test_full_smoke_rejects_blank()
    test_full_smoke_rejects_missing_param()
    test_fixture_pipeline_full_smoke()
    test_injected_runtime_throw_fails_pipeline()
    print("AM2 agent gates OK")
