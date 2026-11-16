-- The dojo in the village: which items of the belt lists the patient ticked, and the belt reached.
-- Play and a training aid; no clinical data. Private to the patient.
CREATE TABLE hero_karate (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  belt       integer NOT NULL DEFAULT 0 CHECK (belt BETWEEN 0 AND 6),
  done       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(done) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hero_karate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_karate FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_karate TO fp_app;
CREATE POLICY karate_read ON hero_karate FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY karate_insert ON hero_karate FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY karate_update ON hero_karate FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
