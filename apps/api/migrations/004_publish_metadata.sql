-- M8a: publish metadata + frozen published version.
-- tags for gallery cards; published_version_id pins public run to a version.
-- draft_params stay private unless explicitly frozen into a new version (service).

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS published_version_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tools_published_version_id_fkey'
    ) THEN
        ALTER TABLE tools
            ADD CONSTRAINT tools_published_version_id_fkey
            FOREIGN KEY (published_version_id)
            REFERENCES tool_versions (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS tools_published_at_idx
    ON tools (published_at DESC NULLS LAST)
    WHERE status = 'published';

COMMENT ON COLUMN tools.tags IS
    'M8a: gallery tags (normalized lowercase strings).';

COMMENT ON COLUMN tools.published_version_id IS
    'M8a: version frozen for public /t/:publicId run. Null = fall back to latest.';
