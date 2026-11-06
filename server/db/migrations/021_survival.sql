-- Survival meters for the hero: water and sleep, logged by the patient. Patient only (like weight):
-- not on the professional record. Energy and stiffness are computed, not stored.

CREATE TABLE water_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,
  ml          smallint NOT NULL CHECK (ml BETWEEN 50 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON water_logs(patient_id, day);

CREATE TABLE sleep_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,              -- the morning after the night
  hours       numeric(3,1) NOT NULL CHECK (hours BETWEEN 0 AND 16),
  quality     smallint NOT NULL CHECK (quality BETWEEN 1 AND 5),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, day)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['water_logs', 'sleep_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()))', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()))', t || '_delete', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, DELETE ON water_logs TO fp_app;
GRANT SELECT, INSERT, UPDATE (hours, quality), DELETE ON sleep_logs TO fp_app;
