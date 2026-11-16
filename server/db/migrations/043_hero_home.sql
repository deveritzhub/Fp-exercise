-- The patient's own home in the village: which bought pieces of furniture stand where.
-- What was bought (and the coins spent) stays in hero_purchases; this holds only the layout.
-- Private to the patient, like the purchases: professionals and friends cannot read it.
CREATE TABLE hero_homes (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  layout     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(layout) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hero_homes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_homes FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_homes TO fp_app;
CREATE POLICY homes_read ON hero_homes FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY homes_insert ON hero_homes FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY homes_update ON hero_homes FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
