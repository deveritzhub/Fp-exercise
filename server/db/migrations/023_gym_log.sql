-- Krachtlog: sets of any exercise, logged in the gym, at home or in the practice, with an estimated 1RM.
-- Available to every patient, outside the strength module and its programmes.
--
-- Who logs: the patient (gym/home/practice) or a professional of the patient's practice (practice).
-- Who reads: the patient always. Professionals of the practice read what was logged in the practice,
-- and the patient's own gym/home entries only when the patient shares the strength module (consent).
-- Each entry can only be deleted by whoever logged it.

CREATE TABLE gym_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id   uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day           date NOT NULL,
  exercise_id   uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL CHECK (char_length(btrim(exercise_name)) BETWEEN 2 AND 80),
  set_no        smallint NOT NULL CHECK (set_no BETWEEN 1 AND 30),
  weight_kg     numeric(6,2) NOT NULL CHECK (weight_kg BETWEEN 0 AND 1000),
  reps          smallint NOT NULL CHECK (reps BETWEEN 1 AND 100),
  rpe           numeric(3,1) CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  place         text NOT NULL DEFAULT 'gym' CHECK (place IN ('gym', 'home', 'practice')),
  logged_by     uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON gym_sets(patient_id, day DESC);
CREATE INDEX ON gym_sets(patient_id, lower(exercise_name));

ALTER TABLE gym_sets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gym_sets FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON gym_sets TO fp_app;

CREATE POLICY gym_read ON gym_sets FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids())
  OR (app.can_manage_patient(patient_id) AND (place = 'practice' OR app.staff_sees_module(patient_id, 'kracht'))));
CREATE POLICY gym_insert ON gym_sets FOR INSERT TO fp_app WITH CHECK (
  logged_by = app.uid() AND practice_id = app.patient_practice(patient_id) AND (
    patient_id IN (SELECT app.my_patient_ids())
    OR (place = 'practice' AND app.can_manage_patient(patient_id))));
CREATE POLICY gym_delete ON gym_sets FOR DELETE TO fp_app USING (
  logged_by = app.uid() AND (patient_id IN (SELECT app.my_patient_ids()) OR app.can_manage_patient(patient_id)));
