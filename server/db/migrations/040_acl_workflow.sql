-- Therapist workflow for the ACL route: who it was assigned to, which criteria still apply,
-- and an optional device name on a clinician measurement. A turned-off criterion does not
-- count toward the boss. Nothing here releases a phase.

CREATE TABLE acl_routes (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  side        text NOT NULL CHECK (side IN ('left', 'right')),
  surgery_on  date,
  start_on    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE acl_routes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON acl_routes FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON acl_routes TO fp_app;
CREATE POLICY acl_route_staff ON acl_routes FOR ALL TO fp_app
  USING (app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id = app.patient_practice(patient_id))
  WITH CHECK (app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id = app.patient_practice(patient_id));

ALTER TABLE phase_boss_goals ADD COLUMN active boolean NOT NULL DEFAULT true;

ALTER TABLE patient_outcomes ADD COLUMN device text NOT NULL DEFAULT '' CHECK (length(device) <= 80);

ALTER TABLE patient_outcomes DROP CONSTRAINT patient_outcomes_unit_check;
ALTER TABLE patient_outcomes ADD CONSTRAINT patient_outcomes_unit_check
  CHECK (unit IN ('degrees', 'kg', 'N', 'Nm', 'score_0_10', 'percent', 'cm', 'grade', 'seconds'));

ALTER TABLE patient_outcomes DROP CONSTRAINT outcomes_domain_unit;
ALTER TABLE patient_outcomes ADD CONSTRAINT outcomes_domain_unit CHECK (
  (domain = 'rom' AND unit = 'degrees' AND value <= 360) OR
  (domain = 'strength' AND unit IN ('kg', 'N', 'Nm')) OR
  (domain = 'function' AND (
    (unit = 'score_0_10' AND value <= 10) OR
    (unit = 'percent' AND value <= 100) OR
    (unit = 'grade' AND value <= 4) OR
    (unit = 'seconds' AND value <= 600) OR
    (unit = 'cm' AND value <= 2000)
  )) OR
  (domain = 'confidence' AND (
    (unit = 'score_0_10' AND value <= 10) OR (unit = 'percent' AND value <= 100)
  ))
);
