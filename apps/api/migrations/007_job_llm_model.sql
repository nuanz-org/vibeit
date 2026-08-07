-- User-selected OpenRouter model for a Create job (plan/codegen/repair).
ALTER TABLE generation_jobs
    ADD COLUMN IF NOT EXISTS llm_model text;

COMMENT ON COLUMN generation_jobs.llm_model IS
    'Optional OpenRouter model id selected at create; null → server role defaults';
