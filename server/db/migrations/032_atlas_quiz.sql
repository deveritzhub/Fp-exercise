-- Spierenatlas quiz: a row per question the patient answered correctly (first time only), so XP is
-- given once per question. Wrong answers are not stored. Only the patient themselves (RLS).
CREATE TABLE hero_quiz_answers (
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  question_id text NOT NULL CHECK (question_id ~ '^[a-z0-9_:]{3,60}$'),
  day         date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Amsterdam')::date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, question_id)
);
ALTER TABLE hero_quiz_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_quiz_answers FROM PUBLIC;
GRANT SELECT, INSERT ON hero_quiz_answers TO fp_app;
CREATE POLICY quiz_own ON hero_quiz_answers FOR ALL TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
