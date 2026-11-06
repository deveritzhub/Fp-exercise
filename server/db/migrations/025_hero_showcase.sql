-- Trophies the patient puts on the shelf behind their hero (at most 3), e.g. 'strength:25'.
ALTER TABLE patient_heroes ADD COLUMN showcase text[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(showcase) <= 3);
GRANT UPDATE (showcase) ON patient_heroes TO fp_app;
