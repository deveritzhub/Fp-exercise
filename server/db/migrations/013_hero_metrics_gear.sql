-- More wearable gear (the list lives in shared/hero.ts) and self-reported body measurements.
-- Measurements are the patient's own: only they can read or change them. Professionals do not.

-- The closet grew past 10 items; a patient may wear every piece they have unlocked.
DO $$
DECLARE c name;
BEGIN
  SELECT con.conname INTO c
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
   WHERE rel.relname = 'patient_heroes' AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%gear%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE patient_heroes DROP CONSTRAINT %I', c);
  END IF;
END $$;
ALTER TABLE patient_heroes ADD CONSTRAINT patient_heroes_gear_check CHECK (cardinality(gear) <= 24);

CREATE TABLE patient_body_metrics (
  patient_id   uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  weight_kg    numeric(5,1),
  body_fat_pct numeric(4,1),
  height_cm    numeric(5,1),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT body_metrics_weight CHECK (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 300),
  CONSTRAINT body_metrics_fat CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 2 AND 60),
  CONSTRAINT body_metrics_height CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 230)
);

ALTER TABLE patient_body_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON patient_body_metrics FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (weight_kg, body_fat_pct, height_cm, updated_at) ON patient_body_metrics TO fp_app;

-- Patient only. Not app.can_manage_patient: weight and body fat stay off the professional record.
CREATE POLICY metrics_read ON patient_body_metrics FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY metrics_insert ON patient_body_metrics FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY metrics_update ON patient_body_metrics FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
