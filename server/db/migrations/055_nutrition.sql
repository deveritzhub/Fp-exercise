-- Nutrition: what the patient ate (per item, with its values), and a week plan for cooking ahead with
-- its shopping list. Patient only, like the protein log: professionals do not see it.
-- Each food item also adds its protein to protein_logs (protein_log_id), so the protein meter, buffs
-- and XP keep working; removing the item removes that row too.

CREATE TABLE food_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id    uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day            date NOT NULL,
  meal           text NOT NULL CHECK (meal IN ('ontbijt', 'lunch', 'diner', 'tussendoor')),
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  food_key       text CHECK (food_key IS NULL OR food_key ~ '^[a-z_]{2,40}$'),
  grams          smallint NOT NULL CHECK (grams BETWEEN 1 AND 3000),
  kcal           smallint NOT NULL CHECK (kcal BETWEEN 0 AND 5000),
  protein_g      numeric(5,1) NOT NULL CHECK (protein_g BETWEEN 0 AND 400),
  carbs_g        numeric(5,1) NOT NULL CHECK (carbs_g BETWEEN 0 AND 800),
  fat_g          numeric(5,1) NOT NULL CHECK (fat_g BETWEEN 0 AND 400),
  protein_log_id uuid REFERENCES protein_logs(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON food_logs(patient_id, day);

CREATE TABLE meal_plans (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  items       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  checked     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(checked) = 'array'),
  goal        text CHECK (goal IS NULL OR goal IN ('spiergroei', 'afvallen', 'gezond')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON food_logs FROM PUBLIC;
REVOKE ALL ON meal_plans FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON food_logs TO fp_app;
-- Only the link to the protein entry may change (when another item of the same meal is removed).
GRANT UPDATE (protein_log_id) ON food_logs TO fp_app;
GRANT SELECT, INSERT, UPDATE ON meal_plans TO fp_app;

CREATE POLICY food_read ON food_logs FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY food_insert ON food_logs FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY food_update ON food_logs FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY food_delete ON food_logs FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY plan_read ON meal_plans FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY plan_insert ON meal_plans FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY plan_update ON meal_plans FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
