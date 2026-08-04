-- M1b: product tables (tools, versions, jobs, assets).
-- Depends on Better Auth `"user"` table (text id). Do not create a second users table.
-- Apply via: uv run python scripts/migrate.py

-- ---------------------------------------------------------------------------
-- tools (owned draft/published tools; gallery fields on the row for MVP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id text NOT NULL,
    owner_user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'draft',
    title text,
    description text,
    thumbnail_asset_id uuid,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tools_status_check CHECK (status IN ('draft', 'published')),
    CONSTRAINT tools_public_id_unique UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS tools_owner_user_id_idx ON tools (owner_user_id);
CREATE INDEX IF NOT EXISTS tools_public_id_idx ON tools (public_id);
CREATE INDEX IF NOT EXISTS tools_status_idx ON tools (status);

-- ---------------------------------------------------------------------------
-- assets (inspiration + studio uploads; export/thumb kinds reserved)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
    kind text NOT NULL,
    storage_key text NOT NULL,
    content_type text NOT NULL,
    byte_size bigint NOT NULL,
    original_filename text,
    tool_id uuid REFERENCES tools (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assets_kind_check CHECK (
        kind IN ('inspiration', 'studio', 'export', 'thumb')
    ),
    CONSTRAINT assets_byte_size_nonneg CHECK (byte_size >= 0),
    CONSTRAINT assets_storage_key_unique UNIQUE (storage_key)
);

CREATE INDEX IF NOT EXISTS assets_owner_user_id_idx ON assets (owner_user_id);
CREATE INDEX IF NOT EXISTS assets_kind_idx ON assets (kind);
CREATE INDEX IF NOT EXISTS assets_tool_id_idx ON assets (tool_id);

-- Circular FK: tools.thumbnail_asset_id → assets (nullable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tools_thumbnail_asset_id_fkey'
    ) THEN
        ALTER TABLE tools
            ADD CONSTRAINT tools_thumbnail_asset_id_fkey
            FOREIGN KEY (thumbnail_asset_id)
            REFERENCES assets (id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- tool_versions (code + param schema + plan per version)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tool_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id uuid NOT NULL REFERENCES tools (id) ON DELETE CASCADE,
    target text NOT NULL,
    code text NOT NULL DEFAULT '',
    param_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
    default_params jsonb NOT NULL DEFAULT '{}'::jsonb,
    asset_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
    plan jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tool_versions_target_check CHECK (
        target IN ('canvas2d', 'p5', 'three')
    )
);

CREATE INDEX IF NOT EXISTS tool_versions_tool_id_idx ON tool_versions (tool_id);

-- ---------------------------------------------------------------------------
-- generation_jobs (Create pipeline; status machine from M0e)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
    tool_id uuid REFERENCES tools (id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'queued',
    vision_text text NOT NULL,
    inspiration_asset_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    error_code text,
    error_message text,
    tokens_used integer,
    token_budget integer,
    cost_cents integer,
    repair_budget integer NOT NULL DEFAULT 2,
    repairs_used integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT generation_jobs_status_check CHECK (
        status IN ('queued', 'running', 'succeeded', 'failed')
    ),
    CONSTRAINT generation_jobs_repairs_nonneg CHECK (
        repair_budget >= 0 AND repairs_used >= 0
    )
);

CREATE INDEX IF NOT EXISTS generation_jobs_owner_user_id_idx
    ON generation_jobs (owner_user_id);
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx
    ON generation_jobs (status);
CREATE INDEX IF NOT EXISTS generation_jobs_owner_status_idx
    ON generation_jobs (owner_user_id, status);
