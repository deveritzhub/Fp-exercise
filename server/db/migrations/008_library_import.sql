-- Importing a practice's own exercise library (JSON) and phased programme templates.
-- `source_key` is the id used in the imported file, so a new version of the file updates the same rows.
ALTER TABLE exercises ADD COLUMN source_key text CHECK (length(source_key) <= 80);
CREATE UNIQUE INDEX exercises_practice_source_uq ON exercises(practice_id, source_key) WHERE source_key IS NOT NULL;

ALTER TABLE programs ADD COLUMN source_key text CHECK (length(source_key) <= 80);
CREATE UNIQUE INDEX programs_practice_source_uq ON programs(practice_id, source_key) WHERE source_key IS NOT NULL AND is_template;
