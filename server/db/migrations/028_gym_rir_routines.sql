-- Krachtlog, advanced: reps in reserve (RIR) per set, optional.
ALTER TABLE gym_sets ADD COLUMN rir smallint CHECK (rir IS NULL OR rir BETWEEN 0 AND 10);

-- Own routines ("Mijn schema's"): a named list of exercises with target sets and reps, saved on the
-- patient's account and started from the Krachtlog. Only the patient reads and writes them; the
-- sets logged from a routine follow the gym_sets rules (shared with the practice only with consent).
CREATE TABLE gym_routines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  items       jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 20),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON gym_routines(patient_id, updated_at DESC);
ALTER TABLE gym_routines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gym_routines FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON gym_routines TO fp_app;
CREATE POLICY routines_own ON gym_routines FOR ALL TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
