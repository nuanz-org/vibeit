#!/usr/bin/env python3
"""
Three target offline eval gates (Track B5).

CI-safe: golden host smoke + policy + vendor pin + agent prompts.
Does not require OPENROUTER_API_KEY.

Usage (from apps/api):
  uv run python scripts/eval_three.py
  uv run python scripts/eval_three.py --json
  uv run python scripts/eval_three.py --skip-host

Exit 0 when all required gates pass (recommend enabling three behind env flag).
Exit 1 on failure.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_API_ROOT = Path(__file__).resolve().parents[1]
_SRC = _API_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.evals.three_gates import run_three_offline_gates


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Three offline eval gates (B5)")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON report",
    )
    parser.add_argument(
        "--skip-host",
        action="store_true",
        help="Skip Playwright host smoke (not for CI if browser is available)",
    )
    args = parser.parse_args(argv)

    report = run_three_offline_gates(skip_host=args.skip_host)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
        return 0 if report.gates_passed else 1

    print(
        f"Three eval (offline) — {report.required_passed}/{report.required_total} "
        f"required gates"
    )
    print(f"  corpus: {report.corpus_path} ({report.corpus_prompt_count} live prompts)")
    print()
    for g in report.gates:
        flag = "PASS" if g.ok else "FAIL"
        req = "" if g.required else " (optional)"
        print(f"  [{flag}] {g.id}{req}: {g.detail}")
    print()
    print(f"  gates:            {'PASS' if report.gates_passed else 'FAIL'}")
    print(
        f"  recommend_enable: "
        f"{'yes — set AIDITR_TARGET_THREE_ENABLED=1' if report.recommend_enable else 'no'}"
    )
    for n in report.notes:
        print(f"  note: {n}")

    return 0 if report.gates_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
