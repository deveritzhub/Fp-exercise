-- Daily steps: a Google Health connection (Fitbit, Pixel Watch, phone) and a manual fallback.
-- Tokens stay on this table and are stored encrypted by the app. Professionals cannot read them.

CREATE TABLE step_goals (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  steps       integer NOT NULL CHECK (steps BETWEEN 1000 AND 20000),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE step_days (
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,
  steps       integer NOT NULL CHECK (steps BETWEEN 0 AND 100000),
  source      text NOT NULL CHECK (source IN ('manual', 'google_health')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, day)
);

CREATE TABLE fitness_connections (
  patient_id        uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider = 'google_health'),
  practice_id       uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  external_user_id  text,
  access_token      text NOT NULL,
  refresh_token     text,
  expires_at        timestamptz,
  scope             text,
  connected_at      timestamptz NOT NULL DEFAULT now(),
  synced_at         timestamptz,
  PRIMARY KEY (patient_id, provider)
);

-- Single-use OAuth state for the Google Health connect redirect. The raw state lives in a cookie.
CREATE TABLE fitness_oauth_states (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_hash    text NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  expires_at    timestamptz NOT NULL
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['step_goals', 'step_days', 'fitness_connections', 'fitness_oauth_states']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE (steps, updated_at) ON step_goals TO fp_app;
GRANT SELECT, INSERT, UPDATE (steps, source, updated_at), DELETE ON step_days TO fp_app;
GRANT SELECT, INSERT, UPDATE (external_user_id, access_token, refresh_token, expires_at, scope, connected_at, synced_at), DELETE ON fitness_connections TO fp_app;
GRANT SELECT, INSERT, DELETE ON fitness_oauth_states TO fp_app;

-- Patient only. Step counts and the health-account tokens are not part of the professional record.
CREATE POLICY step_goal_read ON step_goals FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY step_goal_insert ON step_goals FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY step_goal_update ON step_goals FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY step_day_read ON step_days FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY step_day_insert ON step_days FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY step_day_update ON step_days FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY step_day_delete ON step_days FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY fit_read ON fitness_connections FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY fit_insert ON fitness_connections FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY fit_update ON fitness_connections FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY fit_delete ON fitness_connections FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY fit_state_read ON fitness_oauth_states FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY fit_state_insert ON fitness_oauth_states FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY fit_state_delete ON fitness_oauth_states FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
