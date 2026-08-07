-- AM7: Control refine jobs (chat patch on existing tool version)
ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS job_kind text NOT NULL DEFAULT 'create';

ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS base_version_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'generation_jobs_job_kind_check'
    ) THEN
        ALTER TABLE generation_jobs
            ADD CONSTRAINT generation_jobs_job_kind_check
            CHECK (job_kind IN ('create', 'refine'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'generation_jobs_base_version_id_fkey'
    ) THEN
        ALTER TABLE generation_jobs
            ADD CONSTRAINT generation_jobs_base_version_id_fkey
            FOREIGN KEY (base_version_id)
            REFERENCES tool_versions (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS generation_jobs_tool_kind_idx
    ON generation_jobs (tool_id, job_kind, created_at DESC);

COMMENT ON COLUMN generation_jobs.job_kind IS
    'create (default) | refine (AM7 Control chat patch)';
COMMENT ON COLUMN generation_jobs.base_version_id IS
    'AM7: tool_versions.id that refine patches; null for create';
