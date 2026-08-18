-- Gallery remix: lineage from the published source tool.
-- Null = original (not a fork). ON DELETE SET NULL so source takedown
-- does not cascade-delete remixes.

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS forked_from_tool_id uuid NULL
    REFERENCES tools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tools_forked_from_idx
    ON tools (forked_from_tool_id)
    WHERE forked_from_tool_id IS NOT NULL;

COMMENT ON COLUMN tools.forked_from_tool_id IS
    'Source tool this draft was forked from (gallery remix). Null = original.';
