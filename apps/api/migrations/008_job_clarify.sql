-- A3: planMode clarify pause + structured clarify payload on generation_jobs.
-- Status machine adds awaiting_clarify (worker pause for user answers).

ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS plan_mode boolean NOT NULL DEFAULT false;

ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS clarify jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Replace status check to include awaiting_clarify
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'generation_jobs_status_check'
    ) THEN
        ALTER TABLE generation_jobs
            DROP CONSTRAINT generation_jobs_status_check;
    END IF;
END $$;

ALTER TABLE generation_jobs
    ADD CONSTRAINT generation_jobs_status_check
    CHECK (
        status IN (
            'queued',
            'running',
            'awaiting_clarify',
            'succeeded',
            'failed'
        )
    );

CREATE INDEX IF NOT EXISTS generation_jobs_plan_mode_idx
    ON generation_jobs (plan_mode)
    WHERE plan_mode = true;

COMMENT ON COLUMN generation_jobs.plan_mode IS
    'A3: when true, worker runs clarify first and may pause at awaiting_clarify';
COMMENT ON COLUMN generation_jobs.clarify IS
    'A3: { understanding, questions[], answers, result, answered }';
