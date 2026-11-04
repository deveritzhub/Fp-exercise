-- Mobility self-tests (shared/mobilityTests.ts): one result per test, side and day, in cm.
-- The patient's own data. Staff read it only when the patient shares the mobility part
-- (app.staff_sees_module), the same rule as the strength log.

CREATE TABLE mobility_tests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  test        text NOT NULL CHECK (test ~ '^[a-z_]{2,32}$'),
  side        text NOT NULL CHECK (side IN ('left', 'right', 'none')),
  day         date NOT NULL,
  cm          numeric(4,1) NOT NULL CHECK (cm BETWEEN -60 AND 80),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, test, side, day)
);
CREATE INDEX ON mobility_tests(patient_id, test, day);

ALTER TABLE mobility_tests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mobility_tests FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON mobility_tests TO fp_app;
GRANT UPDATE (cm, created_at) ON mobility_tests TO fp_app;

CREATE POLICY mobility_read ON mobility_tests FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids())
  OR (app.can_manage_patient(patient_id) AND app.staff_sees_module(patient_id, 'mobiliteit')));
CREATE POLICY mobility_insert ON mobility_tests FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY mobility_update ON mobility_tests FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY mobility_delete ON mobility_tests FOR DELETE TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
