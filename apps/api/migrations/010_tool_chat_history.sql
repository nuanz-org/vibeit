-- Tool-scoped Studio chat transcript (continuous refine after Create).
-- Shape matches generation_jobs.message_history entries.

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS chat_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tools.chat_history IS
    'Ordered Studio refine turns: [{id, role, content, kind?, createdAt, meta?}]';
