"""
Product schema notes (M1b) — documentation for repositories (M1c).

Tables live in Postgres via versioned SQL in apps/api/migrations/.
Auth identity: Better Auth `"user".id` (text). No product users table.

| Table             | Purpose                                      |
|-------------------|----------------------------------------------|
| tools             | Owned tool; draft/published + gallery fields |
| tool_versions     | Code, param schema, slots, plan per version  |
| generation_jobs   | Create/refine job status machine (M0e + AM7) |
| assets            | Inspiration / studio (export/thumb later)    |
| schema_migrations | Applied SQL migration versions               |

M8a columns on tools: tags (text[]), published_version_id (FK → tool_versions).
M8b columns on tools: gallery_ready (bool), export_smoke_at (timestamptz).
  published ≠ gallery: status=published enables /t share; gallery_ready after gates.
AM7 columns on generation_jobs: job_kind (create|refine), base_version_id.
007 columns on generation_jobs: llm_model (user-selected OpenRouter id).
008 columns on generation_jobs: plan_mode (bool), clarify (jsonb);
  status includes awaiting_clarify for A3 planMode pause.
009 columns on generation_jobs: message_history (jsonb array of chat turns).
011 columns on tools: forked_from_tool_id (FK → tools, gallery remix lineage).
"""

from __future__ import annotations

PRODUCT_TABLES: tuple[str, ...] = (
    "tools",
    "tool_versions",
    "generation_jobs",
    "assets",
)

TOOL_STATUSES: tuple[str, ...] = ("draft", "published")
JOB_STATUSES: tuple[str, ...] = (
    "queued",
    "running",
    "awaiting_clarify",
    "succeeded",
    "failed",
)
JOB_KINDS: tuple[str, ...] = ("create", "refine")
ASSET_KINDS: tuple[str, ...] = ("inspiration", "studio", "export", "thumb")
TARGET_IDS: tuple[str, ...] = ("canvas2d", "p5", "three")
