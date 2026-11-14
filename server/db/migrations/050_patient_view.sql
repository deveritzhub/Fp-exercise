-- How the patient wants to use the app: as a game (village, hero, XP) or plainly (the exercises, large
-- and without the game). No row = not chosen yet. The patient chooses; a professional who treats the
-- patient may set it too (e.g. for an older patient). XP keeps counting either way.
CREATE TABLE patient_views (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  simple     boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE patient_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON patient_views FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON patient_views TO fp_app;
CREATE POLICY views_read ON patient_views FOR SELECT TO fp_app USING (app.can_access_patient(patient_id));
CREATE POLICY views_insert ON patient_views FOR INSERT TO fp_app WITH CHECK (app.can_access_patient(patient_id));
CREATE POLICY views_update ON patient_views FOR UPDATE TO fp_app USING (app.can_access_patient(patient_id)) WITH CHECK (app.can_access_patient(patient_id));
