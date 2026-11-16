-- Nutrition, step two: a profile for the daily guide, own products, favourite meals, and own items on
-- the shopping list. All patient only, like the rest of nutrition.
CREATE TABLE nutrition_profiles (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  sex         text CHECK (sex IS NULL OR sex IN ('m', 'v')),
  birth_year  smallint CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2020),
  activity    text NOT NULL DEFAULT 'licht' CHECK (activity IN ('zittend', 'licht', 'actief', 'zeer')),
  goal        text NOT NULL DEFAULT 'onderhoud' CHECK (goal IN ('afvallen', 'onderhoud', 'spiergroei')),
  hide_kcal   boolean NOT NULL DEFAULT false,
  diet        text NOT NULL DEFAULT 'alles' CHECK (diet IN ('alles', 'vegetarisch', 'veganistisch')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE own_foods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  kcal        smallint NOT NULL CHECK (kcal BETWEEN 0 AND 900),
  protein_g   numeric(4,1) NOT NULL CHECK (protein_g BETWEEN 0 AND 100),
  carbs_g     numeric(4,1) NOT NULL CHECK (carbs_g BETWEEN 0 AND 100),
  fat_g       numeric(4,1) NOT NULL CHECK (fat_g BETWEEN 0 AND 100),
  portion_g   smallint NOT NULL DEFAULT 100 CHECK (portion_g BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON own_foods(patient_id);

CREATE TABLE meal_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  meal        text NOT NULL CHECK (meal IN ('ontbijt', 'lunch', 'diner', 'tussendoor')),
  items       jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 30),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON meal_favorites(patient_id);

ALTER TABLE meal_plans ADD COLUMN extras jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(extras) = 'array');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['nutrition_profiles', 'own_foods', 'meal_favorites']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()))', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()))', t || '_delete', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, DELETE ON own_foods, meal_favorites TO fp_app;
GRANT SELECT, INSERT, UPDATE (sex, birth_year, activity, goal, hide_kcal, diet, updated_at) ON nutrition_profiles TO fp_app;
CREATE POLICY nutrition_profiles_update ON nutrition_profiles FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
