-- M5c: live Studio personalization on tools (params + asset bindings).
-- One draft bag per tool — not a new tool_versions row per slider tick.
-- Generation baseline stays on tool_versions.default_params / asset_slots.

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS draft_params jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS draft_assets jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tools.draft_params IS
    'M5c: owner Studio param bag overlay (colors, numbers, …). Full replace on PATCH.';

COMMENT ON COLUMN tools.draft_assets IS
    'M5c: owner Studio asset slot → http URL (or null). Full replace on PATCH.';
