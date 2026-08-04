"""
M1 demo checklist (M1f) — automated parts.

Manual UI checks (sign-up, /create redirect) remain human-verified;
this script covers API gates + schema + upload + CORS that M1 exit requires.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from adapters.db.ids import new_public_id


def test_public_id_strategy() -> None:
    """M1f: public_id generated at tool create (M1c helper)."""
    a = new_public_id("t")
    b = new_public_id("t")
    assert a.startswith("t_")
    assert b.startswith("t_")
    assert a != b
    assert len(a) >= 8


def test_access_rules_doc_exists() -> None:
    root = Path(__file__).resolve().parents[3]  # repo root
    path = root / "md" / "access-rules.md"
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    assert "Draft tool" in text
    assert "Source download" in text
    assert "public_id" in text
    assert "/api/v1/assets/raw" in text or "assets/raw" in text


def test_run_m1_smokes_as_checklist() -> None:
    """
    Re-run sub-milestone smokes that map to the M1 demo checklist:

    - POST /jobs without cookie → 401; with user → 201  (M1a)
    - Product tables present                                      (M1b)
    - Draft tool insert/read with real user                       (M1c)
    - Storage + CORS serve                                        (M1d)
    - Upload → storage + DB + raw URL                             (M1e)
    """
    # Import and execute the existing smoke entrypoints
    import test_jobs_m1a
    import test_schema_m1b
    import test_repos_m1c
    import test_storage_m1d
    import test_upload_m1e

    test_jobs_m1a.test_create_job_unauthorized()
    test_jobs_m1a.test_create_job_authenticated_returns_queued()
    test_schema_m1b.test_product_schema_present()
    test_repos_m1c.test_repositories_with_real_user()
    test_storage_m1d.test_cors_headers_reflect_allowlisted_origin()
    test_storage_m1d.test_serve_object_with_cors()
    test_upload_m1e.test_upload_unauthorized()
    test_upload_m1e.test_upload_authenticated_http_round_trip()


if __name__ == "__main__":
    test_public_id_strategy()
    test_access_rules_doc_exists()
    test_run_m1_smokes_as_checklist()
    print("M1f demo checklist (automated) OK")
    print()
    print("Manual (browser) still recommended once:")
    print("  [ ] Sign up / sign in via apps/web")
    print("  [ ] Logged-out /create → redirect to login")
    print("  [ ] /create upload + create-job stubs with live session")
