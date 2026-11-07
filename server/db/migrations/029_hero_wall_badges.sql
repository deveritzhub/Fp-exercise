-- Badges the patient pins on the wall behind their hero (at most 4). The wall only shows when
-- something is placed (these badges or showcase trophies).
ALTER TABLE patient_heroes ADD COLUMN wall_badges text[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(wall_badges) <= 4);
GRANT UPDATE (wall_badges) ON patient_heroes TO fp_app;
