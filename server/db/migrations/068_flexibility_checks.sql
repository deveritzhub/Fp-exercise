-- Flexibility paths (pancake, splits, touching the toes): the criteria a patient ticked off per phase.
-- Patient-private, like the rest of the mobility module; part of the data export; deleted with the patient.
CREATE TABLE flexibility_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  path        text NOT NULL CHECK (path ~ '^[a-z_]{2,30}$'),
  phase       smallint NOT NULL CHECK (phase BETWEEN 1 AND 8),
  item        text NOT NULL CHECK (item ~ '^[a-z0-9_]{2,30}$'),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, path, phase, item)
);

ALTER TABLE flexibility_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON flexibility_checks FROM PUBLIC;
CREATE POLICY flexibility_checks_read ON flexibility_checks FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY flexibility_checks_insert ON flexibility_checks FOR INSERT TO fp_app
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY flexibility_checks_delete ON flexibility_checks FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
GRANT SELECT, INSERT, DELETE ON flexibility_checks TO fp_app;
