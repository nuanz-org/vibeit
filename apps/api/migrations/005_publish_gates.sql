-- M8b: gallery eligibility after quality gates.
-- status=published enables share /t/:publicId (M7 thin).
-- gallery_ready=true only after preview + export smoke gates pass (gallery list).

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS gallery_ready boolean NOT NULL DEFAULT false;

ALTER TABLE tools
    ADD COLUMN IF NOT EXISTS export_smoke_at timestamptz;

CREATE INDEX IF NOT EXISTS tools_gallery_ready_idx
    ON tools (published_at DESC NULLS LAST)
    WHERE status = 'published' AND gallery_ready = true;

COMMENT ON COLUMN tools.gallery_ready IS
    'M8b: true when publish gates passed for gallery listing. Share can be published without this.';

COMMENT ON COLUMN tools.export_smoke_at IS
    'M8b: when owner last confirmed client export/capture smoke for gallery publish.';
