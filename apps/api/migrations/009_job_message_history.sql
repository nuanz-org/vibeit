-- Persist Create/Refine chat turns (user + assistant) as ordered history on the job.

ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS message_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN generation_jobs.message_history IS
    'Ordered chat turns: [{id, role, content, kind?, createdAt, meta?}]';
