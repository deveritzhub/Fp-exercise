-- Patient-only logs: workouts the patient did outside the programme, and protein grams.
-- XP is computed from these rows (shared/patientLogs.ts). Professionals do not see them.

CREATE TABLE protein_goals (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  grams       smallint NOT NULL CHECK (grams BETWEEN 40 AND 250),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE protein_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,
  grams       smallint NOT NULL CHECK (grams BETWEEN 1 AND 150),
  label       text CHECK (label IS NULL OR char_length(label) <= 40),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON protein_logs(patient_id, day);

CREATE TABLE self_trainings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id      uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day              date NOT NULL,
  kind             text NOT NULL CHECK (kind ~ '^[a-z_]{2,32}$'),
  minutes          smallint NOT NULL CHECK (minutes BETWEEN 1 AND 180),
  pain             smallint CHECK (pain IS NULL OR pain BETWEEN 0 AND 10),
  stopped_for_pain boolean NOT NULL DEFAULT false,
  note             text CHECK (note IS NULL OR char_length(note) <= 280),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON self_trainings(patient_id, day);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['protein_goals', 'protein_logs', 'self_trainings']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE (grams, updated_at) ON protein_goals TO fp_app;
GRANT SELECT, INSERT, DELETE ON protein_logs TO fp_app;
GRANT SELECT, INSERT, DELETE ON self_trainings TO fp_app;

-- Patient only, same as body measurements. Not part of the professional record.
CREATE POLICY protein_goal_read ON protein_goals FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY protein_goal_insert ON protein_goals FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY protein_goal_update ON protein_goals FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY protein_read ON protein_logs FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY protein_insert ON protein_logs FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY protein_delete ON protein_logs FOR DELETE TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY train_read ON self_trainings FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY train_insert ON self_trainings FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY train_delete ON self_trainings FOR DELETE TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
