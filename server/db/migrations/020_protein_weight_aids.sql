-- Protein targets from body weight (minimum / suboptimal / optimal, see shared/protein.ts), a weight
-- history, and walking aids (crutches) that the professional switches on for the patient's hero.

-- Weight history: one value per day, patient only (like patient_body_metrics: not on the professional record).
CREATE TABLE weight_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,
  kg          numeric(5,1) NOT NULL CHECK (kg BETWEEN 20 AND 300),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, day)
);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON weight_logs FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (kg), DELETE ON weight_logs TO fp_app;
CREATE POLICY weight_read ON weight_logs FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY weight_insert ON weight_logs FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY weight_update ON weight_logs FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY weight_delete ON weight_logs FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));

-- 65+ raises the minimum (PROT-AGE / ESPEN). The chosen level follows the weight automatically.
ALTER TABLE patient_body_metrics ADD COLUMN older_adult boolean NOT NULL DEFAULT false;
GRANT UPDATE (older_adult) ON patient_body_metrics TO fp_app;
ALTER TABLE protein_goals ADD COLUMN tier text CHECK (tier IN ('minimum', 'suboptimal', 'optimal'));
GRANT UPDATE (tier) ON protein_goals TO fp_app;

-- Walking aids on the hero, switched by the professional (e.g. crutches in the first weeks after ACL
-- surgery). Not shared with friends.
ALTER TABLE patients ADD COLUMN hero_aids text[] NOT NULL DEFAULT '{}'
  CHECK (hero_aids <@ ARRAY['crutches']::text[]);
GRANT UPDATE (hero_aids) ON patients TO fp_app;
