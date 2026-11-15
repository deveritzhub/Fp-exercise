-- Heart rate measured during a workout (Bluetooth strap/watch, or the phone's health platform through
-- the app): one summary per session. Patient only, like the other self-tracked data: professionals do
-- not see it unless that is decided and built later with the patient's consent.
CREATE TABLE session_heart_rates (
  session_id  uuid PRIMARY KEY REFERENCES workout_sessions(id) ON DELETE CASCADE,
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  avg_bpm     smallint NOT NULL CHECK (avg_bpm BETWEEN 30 AND 240),
  max_bpm     smallint NOT NULL CHECK (max_bpm BETWEEN 30 AND 240),
  min_bpm     smallint NOT NULL CHECK (min_bpm BETWEEN 30 AND 240),
  seconds     integer NOT NULL CHECK (seconds BETWEEN 1 AND 21600),
  source      text NOT NULL CHECK (source IN ('bluetooth', 'health_connect', 'healthkit')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (min_bpm <= avg_bpm AND avg_bpm <= max_bpm)
);
CREATE INDEX ON session_heart_rates(patient_id, created_at DESC);
ALTER TABLE session_heart_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON session_heart_rates FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON session_heart_rates TO fp_app;
CREATE POLICY shr_read ON session_heart_rates FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY shr_insert ON session_heart_rates FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY shr_delete ON session_heart_rates FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
