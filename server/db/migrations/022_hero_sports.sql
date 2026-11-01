-- A hero can do several sports. `sport` stays the main one (the first ticked; used for the badge).
ALTER TABLE patient_heroes ADD COLUMN sports text[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(sports) <= 10 AND sports <@ ARRAY['running','football','fitness','cycling','tennis','swimming','hockey','dance','walking','other']::text[]);
UPDATE patient_heroes SET sports = ARRAY[sport] WHERE sport = ANY(ARRAY['running','football','fitness','cycling','tennis','swimming','hockey','dance','walking','other']);
GRANT UPDATE (sports) ON patient_heroes TO fp_app;
