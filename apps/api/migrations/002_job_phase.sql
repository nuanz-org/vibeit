-- M3e: track Create graph phase for status polling
ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS phase text;

COMMENT ON COLUMN generation_jobs.phase IS
    'Optional Create graph phase while running: plan|codegen|validate|repair|smoke|finalize';
