-- Clinician-recorded outcomes, append-only. No patient, friend or public API access.
-- Capture discrete outcome measurements, not inferred recovery percentages.
CREATE TABLE patient_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES users(id),
  measured_on date NOT NULL,
  domain text NOT NULL CHECK (domain IN ('rom','strength','function','confidence')),
  metric text NOT NULL CHECK (length(metric) BETWEEN 1 AND 80),
  value numeric(9,2) NOT NULL CHECK (value BETWEEN 0 AND 100000),
  unit text NOT NULL CHECK (unit IN ('degrees','kg','N','score_0_10','percent')),
  side text NOT NULL DEFAULT 'not_applicable' CHECK (side IN ('left','right','bilateral','not_applicable')),
  note text NOT NULL DEFAULT '' CHECK (length(note)<=300),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outcomes_domain_unit CHECK (
    (domain='rom' AND unit='degrees' AND value<=360) OR
    (domain='strength' AND unit IN ('kg','N')) OR
    (domain IN ('function','confidence') AND (
      (unit='score_0_10' AND value<=10) OR (unit='percent' AND value<=100)
    ))
  )
);
CREATE INDEX patient_outcomes_recent_idx ON patient_outcomes(patient_id, measured_on DESC, created_at DESC);
ALTER TABLE patient_outcomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON patient_outcomes FROM PUBLIC;
GRANT SELECT, INSERT ON patient_outcomes TO fp_app;
CREATE POLICY outcomes_staff_read ON patient_outcomes FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id=app.patient_practice(patient_id)
);
CREATE POLICY outcomes_staff_insert ON patient_outcomes FOR INSERT TO fp_app WITH CHECK (
  app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id=app.patient_practice(patient_id)
  AND recorded_by=app.uid()
);
-- Corrections and deletions are deliberately disabled: preserve an audit trail until an
-- explicit correction/cancellation workflow and retention policy are reviewed.
