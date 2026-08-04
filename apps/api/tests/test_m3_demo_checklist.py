"""
M3 demo checklist (M3h) — automated parts.

Manual Create → Studio browser path: md/m3-demo-checklist.md
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

_API = Path(__file__).resolve().parents[1]
_ROOT = _API.parents[1]
_SRC = _API / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


def test_eval_prompts_exist_and_sized() -> None:
    path = _API / "evals" / "create" / "prompts.json"
    assert path.is_file(), f"missing {path}"
    data = json.loads(path.read_text(encoding="utf-8"))
    prompts = data["prompts"]
    assert len(prompts) >= 10
    assert data["gates"]["minFirstPassRate"] == 0.7
    assert data["gates"]["minAfterRepairRate"] == 0.9
    for p in prompts:
        assert p.get("id") and p.get("vision")


def test_m3_checklist_doc_exists() -> None:
    path = _ROOT / "md" / "m3-demo-checklist.md"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "eval_create" in text
    assert "QUOTA" in text.upper() or "quota" in text
    assert "Studio" in text
    assert "deepseek/deepseek-v4-flash" in text


def test_eval_create_mock_passes_gates() -> None:
    """Run offline eval; must exit 0 (gates pass)."""
    proc = subprocess.run(
        [sys.executable, str(_API / "scripts" / "eval_create.py"), "--json"],
        cwd=str(_API),
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "EVAL_LIVE": "0"},
    )
    assert proc.returncode == 0, proc.stdout + "\n" + proc.stderr
    summary = json.loads(proc.stdout)
    assert summary["gates_passed"] is True
    assert summary["total"] >= 10
    assert summary["mode"] == "mock"
    assert summary["first_pass_rate"] >= 0.7 or summary["after_repair_rate"] >= 0.9


def test_run_core_m3_smokes() -> None:
    """Re-run critical M3 unit smokes as checklist."""
    tests = [
        "tests/test_llm_m3b.py",
        "tests/test_agent_m3c.py",
        "tests/test_agent_m3d.py",
        "tests/test_quota_m3f.py",
    ]
    for rel in tests:
        proc = subprocess.run(
            [sys.executable, str(_API / rel)],
            cwd=str(_API),
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode == 0, f"{rel} failed:\n{proc.stdout}\n{proc.stderr}"


if __name__ == "__main__":
    test_eval_prompts_exist_and_sized()
    test_m3_checklist_doc_exists()
    test_eval_create_mock_passes_gates()
    test_run_core_m3_smokes()
    print("M3 demo checklist (automated) OK")
    print()
    print("Manual (browser) still recommended once:")
    print("  [ ] /create → generate → /studio/{uuid}")
    print("  See md/m3-demo-checklist.md")
