"""
Track B5 — offline three eval gates.

Deterministic (CI-safe) checks that prove the three path is safe to enable
via AIDITR_TARGET_THREE_ENABLED. Does not require live LLM.

Usage:
  from agent.evals.three_gates import run_three_offline_gates
  report = run_three_offline_gates()
  assert report.gates_passed
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from agent.golden.index import GOLDEN_MANIFEST, load_golden_source
from agent.prompts.create_codegen import codegen_system_prompt
from agent.prompts.create_plan import plan_system_prompt
from agent.prompts.create_repair import repair_system_prompt
from agent.target_policy import (
    enabled_targets,
    resolve_plan_target,
    three_enabled,
)
from agent.validators.compile_check import COMPILED_JS_MAX_CHARS, run_compile_check
from agent.validators.param_coverage import run_param_coverage
from agent.validators.sandbox_smoke import run_sandbox_smoke, run_structural_smoke
from agent.validators.static_validate import static_validate_tool_source

_API_ROOT = Path(__file__).resolve().parents[3]
_REPO_ROOT = _API_ROOT.parent.parent
_CORPUS_PATH = _API_ROOT / "evals" / "create" / "three" / "prompts.json"
_CONTRACTS_PKG = _REPO_ROOT / "packages" / "contracts" / "package.json"
_THREE_SKELETON = (
    _REPO_ROOT / "packages" / "contracts" / "src" / "skeletons" / "three.ts"
)
_VENDOR_TS = (
    _REPO_ROOT
    / "packages"
    / "contracts"
    / "src"
    / "skeletons"
    / "three-vendor.ts"
)
_RESOLVE_TARGET = (
    _REPO_ROOT
    / "apps"
    / "web"
    / "features"
    / "studio"
    / "lib"
    / "resolve-runtime-target.ts"
)

THREE_PIN = "0.185.1"


@dataclass(frozen=True, slots=True)
class GateResult:
    id: str
    ok: bool
    detail: str
    required: bool = True


@dataclass
class ThreeEvalReport:
    """Offline three gate report (B5)."""

    mode: str
    gates: list[GateResult] = field(default_factory=list)
    gates_passed: bool = False
    required_total: int = 0
    required_passed: int = 0
    recommend_enable: bool = False
    corpus_path: str = ""
    corpus_prompt_count: int = 0
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "gates_passed": self.gates_passed,
            "recommend_enable": self.recommend_enable,
            "required_total": self.required_total,
            "required_passed": self.required_passed,
            "corpus_path": self.corpus_path,
            "corpus_prompt_count": self.corpus_prompt_count,
            "notes": self.notes,
            "gates": [asdict(g) for g in self.gates],
        }


def _gate(gid: str, ok: bool, detail: str, *, required: bool = True) -> GateResult:
    return GateResult(id=gid, ok=ok, detail=detail, required=required)


def _load_corpus() -> dict[str, Any] | None:
    if not _CORPUS_PATH.is_file():
        return None
    try:
        return json.loads(_CORPUS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _three_depth_entry():
    return next(e for e in GOLDEN_MANIFEST if e.id == "three-depth")


def run_three_offline_gates(
    *,
    skip_host: bool = False,
) -> ThreeEvalReport:
    """
    Run all offline three gates. Restores AIDITR_TARGET_THREE_ENABLED after.

    skip_host: when True, skip Playwright host smoke (unit-only environments).
    """
    gates: list[GateResult] = []
    notes: list[str] = []
    saved_three = os.environ.get("AIDITR_TARGET_THREE_ENABLED")
    saved_p5 = os.environ.get("AIDITR_TARGET_P5_ENABLED")

    try:
        # --- policy ---
        os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)
        os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)
        off = not three_enabled() and "three" not in enabled_targets()
        gates.append(
            _gate(
                "policy_default_off",
                off,
                "three disabled without env flag"
                if off
                else "three unexpectedly enabled by default",
            )
        )
        clamped = resolve_plan_target("three") == "canvas2d"
        gates.append(
            _gate(
                "policy_clamps_when_off",
                clamped,
                "resolve_plan_target('three') → canvas2d when disabled"
                if clamped
                else "three not clamped when disabled",
            )
        )

        os.environ["AIDITR_TARGET_THREE_ENABLED"] = "1"
        on = three_enabled() and resolve_plan_target("three") == "three"
        gates.append(
            _gate(
                "policy_enable_resolves",
                on,
                "AIDITR_TARGET_THREE_ENABLED=1 enables target three"
                if on
                else "flag did not enable three",
            )
        )
        os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)

        # --- supply / harness ---
        pin_ok = False
        pin_detail = "vendor module missing"
        if _VENDOR_TS.is_file() and _CONTRACTS_PKG.is_file():
            vendor = _VENDOR_TS.read_text(encoding="utf-8")
            pkg = json.loads(_CONTRACTS_PKG.read_text(encoding="utf-8"))
            dep = str(pkg.get("dependencies", {}).get("three") or "")
            m = re.search(r'THREE_AIDITR_PIN\s*=\s*"([^"]+)"', vendor)
            pin = m.group(1) if m else ""
            pin_ok = dep == THREE_PIN and pin == THREE_PIN
            pin_detail = f"package three={dep!r} pin={pin!r} expected={THREE_PIN!r}"
        gates.append(_gate("vendor_pin", pin_ok, pin_detail))

        skel_ok = False
        skel_detail = "skeleton missing"
        if _THREE_SKELETON.is_file():
            skel = _THREE_SKELETON.read_text(encoding="utf-8")
            skel_ok = all(
                s in skel
                for s in (
                    "WebGLRenderer",
                    "PerspectiveCamera",
                    "preserveDrawingBuffer",
                    "three-vendor",
                )
            )
            skel_detail = (
                "Scene/WebGLRenderer/Camera + vendor import present"
                if skel_ok
                else "real three harness markers missing"
            )
        gates.append(_gate("harness_real_three", skel_ok, skel_detail))

        # --- golden path ---
        entry = _three_depth_entry()
        src = load_golden_source(entry)

        static = static_validate_tool_source(src, target="three")
        gates.append(
            _gate(
                "golden_static",
                static.ok,
                "three-depth static ok" if static.ok else "; ".join(static.errors[:5]),
            )
        )

        structural = run_structural_smoke(src, target="three")
        gates.append(
            _gate(
                "golden_structural",
                structural.ok,
                "structural ok"
                if structural.ok
                else "; ".join(structural.errors[:5]),
            )
        )

        compiled = run_compile_check(src)
        compile_ok = compiled.ok and compiled.js is not None
        size_ok = bool(
            compile_ok
            and compiled.js is not None
            and len(compiled.js) < COMPILED_JS_MAX_CHARS
        )
        js_len = len(compiled.js) if compiled.js else 0
        gates.append(
            _gate(
                "golden_compile",
                compile_ok and size_ok,
                f"compiled {js_len} chars (limit {COMPILED_JS_MAX_CHARS})"
                if compile_ok
                else "; ".join(compiled.errors[:5]),
            )
        )

        plan = {
            "params": [
                {"name": "bg"},
                {"name": "accent"},
                {"name": "ink"},
                {"name": "speed"},
                {"name": "intensity"},
            ],
            "target": "three",
        }
        cov = run_param_coverage(src, plan)
        gates.append(
            _gate(
                "golden_param_coverage",
                cov.ok,
                "param coverage ok" if cov.ok else "; ".join(cov.errors[:5]),
            )
        )

        if skip_host:
            gates.append(
                _gate(
                    "golden_host",
                    True,
                    "skipped (skip_host=True)",
                    required=False,
                )
            )
            notes.append("host smoke skipped")
        else:
            full = run_sandbox_smoke(
                src,
                plan=plan,
                job_id="b5-three-gate",
            )
            gates.append(
                _gate(
                    "golden_host",
                    full.ok,
                    "host smoke + capture ok"
                    if full.ok
                    else "; ".join(full.errors[:6]),
                )
            )

        # --- security / agent / studio ---
        cdn = static_validate_tool_source(
            """
import * as THREE from "https://esm.sh/three@0.185.1";
export const createTool = () => ({
  mount() {}, update() {}, dispose() {},
  getParamSchema: () => [], getDefaultParams: () => ({}), getAssetSlots: () => [],
  captureFrame: async () => new Blob(), draw() {},
});
""",
            target="three",
        )
        cdn_blocked = not cdn.ok
        gates.append(
            _gate(
                "allowlist_blocks_cdn",
                cdn_blocked,
                "remote three import rejected"
                if cdn_blocked
                else "CDN import incorrectly allowed",
            )
        )

        bare = static_validate_tool_source(
            """
import * as THREE from "three";
export const createTool = () => ({
  mount() {}, update() {}, dispose() {},
  getParamSchema: () => [], getDefaultParams: () => ({}), getAssetSlots: () => [],
  captureFrame: async () => new Blob(), draw() {},
});
""",
            target="three",
        )
        bare_blocked = not bare.ok
        gates.append(
            _gate(
                "allowlist_blocks_bare_three",
                bare_blocked,
                "bare three import rejected"
                if bare_blocked
                else "bare three incorrectly allowed",
            )
        )

        three_prompt = codegen_system_prompt("three")
        plan_p = plan_system_prompt()
        repair_p = repair_system_prompt("three")
        prompts_ok = (
            "createThreeTool" in three_prompt
            and "MeshStandardMaterial" in three_prompt
            and "three" in plan_p.lower()
            and "createThreeTool" in repair_p
        )
        gates.append(
            _gate(
                "agent_prompts_three",
                prompts_ok,
                "plan/codegen/repair three craft present"
                if prompts_ok
                else "B4 three prompts incomplete",
            )
        )

        mount_ok = _RESOLVE_TARGET.is_file() and (
            "resolveRuntimeTarget" in _RESOLVE_TARGET.read_text(encoding="utf-8")
        )
        gates.append(
            _gate(
                "studio_mount_target",
                mount_ok,
                "resolveRuntimeTarget present"
                if mount_ok
                else "B3 mount helper missing",
            )
        )

        corpus = _load_corpus()
        corpus_ok = False
        prompt_count = 0
        corpus_detail = f"missing {_CORPUS_PATH}"
        if isinstance(corpus, dict):
            prompts = corpus.get("prompts")
            gates_cfg = corpus.get("gates")
            prompt_count = len(prompts) if isinstance(prompts, list) else 0
            corpus_ok = (
                corpus.get("target") == "three"
                and prompt_count >= 3
                and isinstance(gates_cfg, dict)
            )
            corpus_detail = f"{prompt_count} prompts, target={corpus.get('target')!r}"
        gates.append(_gate("corpus_defined", corpus_ok, corpus_detail))

    finally:
        if saved_three is None:
            os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)
        else:
            os.environ["AIDITR_TARGET_THREE_ENABLED"] = saved_three
        if saved_p5 is None:
            os.environ.pop("AIDITR_TARGET_P5_ENABLED", None)
        else:
            os.environ["AIDITR_TARGET_P5_ENABLED"] = saved_p5

    required = [g for g in gates if g.required]
    required_passed = sum(1 for g in required if g.ok)
    gates_passed = all(g.ok for g in required)

    notes.append(
        "Offline green means safe to set AIDITR_TARGET_THREE_ENABLED=1; "
        "product default remains off until operators opt in."
    )
    if gates_passed:
        notes.append("All required offline three gates PASS.")
    else:
        failed = [g.id for g in required if not g.ok]
        notes.append("Failed required gates: " + ", ".join(failed))

    return ThreeEvalReport(
        mode="offline",
        gates=gates,
        gates_passed=gates_passed,
        required_total=len(required),
        required_passed=required_passed,
        recommend_enable=gates_passed,
        corpus_path=str(_CORPUS_PATH.relative_to(_REPO_ROOT))
        if _CORPUS_PATH.is_file()
        else str(_CORPUS_PATH),
        corpus_prompt_count=prompt_count if corpus_ok else prompt_count,
        notes=notes,
    )
