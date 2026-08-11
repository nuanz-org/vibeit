"""B5: three offline eval gates — config-gated until green."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[3]
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.evals.three_gates import THREE_PIN, run_three_offline_gates
from agent.target_policy import resolve_plan_target, three_enabled

_CORPUS = _REPO / "apps" / "api" / "evals" / "create" / "three" / "prompts.json"


def test_three_corpus_file() -> None:
    assert _CORPUS.is_file()
    data = json.loads(_CORPUS.read_text(encoding="utf-8"))
    assert data.get("target") == "three"
    assert data.get("milestone") == "B5"
    prompts = data.get("prompts")
    assert isinstance(prompts, list) and len(prompts) >= 3
    gates = data.get("gates") or {}
    assert float(gates.get("minOfflinePassRate", 0)) >= 1.0
    for p in prompts:
        assert p.get("expectTarget") == "three"


def test_offline_three_gates_pass() -> None:
    """Full offline suite including host smoke — B5 green bar."""
    # Ensure default-off check is meaningful
    os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)
    report = run_three_offline_gates(skip_host=False)
    assert report.mode == "offline"
    assert report.required_total >= 10
    failed = [g for g in report.gates if g.required and not g.ok]
    assert not failed, "required gates failed: " + ", ".join(
        f"{g.id}: {g.detail}" for g in failed
    )
    assert report.gates_passed
    assert report.recommend_enable
    assert report.corpus_prompt_count >= 3


def test_offline_gates_restore_env() -> None:
    os.environ["AIDITR_TARGET_THREE_ENABLED"] = "1"
    try:
        report = run_three_offline_gates(skip_host=True)
        assert report.gates_passed or any(
            g.id == "golden_host" and not g.required for g in report.gates
        )
        # env restored to previous (enabled)
        assert three_enabled()
        assert resolve_plan_target("three") == "three"
    finally:
        os.environ.pop("AIDITR_TARGET_THREE_ENABLED", None)


def test_pin_constant_matches_expected() -> None:
    assert THREE_PIN == "0.185.1"


def test_eval_three_script_exits_zero() -> None:
    import subprocess

    script = _REPO / "apps" / "api" / "scripts" / "eval_three.py"
    result = subprocess.run(
        [sys.executable, str(script), "--json"],
        cwd=_REPO / "apps" / "api",
        capture_output=True,
        text=True,
        timeout=300,
        env={**os.environ, "PYTHONPATH": str(_SRC)},
    )
    assert result.returncode == 0, result.stdout + result.stderr
    payload = json.loads(result.stdout)
    assert payload["gates_passed"] is True
    assert payload["recommend_enable"] is True


if __name__ == "__main__":
    test_three_corpus_file()
    test_offline_three_gates_pass()
    test_offline_gates_restore_env()
    test_pin_constant_matches_expected()
    test_eval_three_script_exits_zero()
    print("test_track_b5_three_gates: ok")
