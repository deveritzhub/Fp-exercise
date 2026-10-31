-- Patient "sports hero" (gamified revalidatie): the patient's own character and a body map with
-- self-reported pain per area. XP, levels and badges are computed from existing data, not stored.

CREATE TABLE patient_heroes (
  patient_id  uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  hero_name   text NOT NULL CHECK (char_length(hero_name) BETWEEN 1 AND 40),
  skin        text NOT NULL CHECK (skin ~ '^[a-z0-9_]{1,20}$'),
  hair        text NOT NULL CHECK (hair ~ '^[a-z0-9_]{1,20}$'),
  outfit      text NOT NULL CHECK (outfit ~ '^[a-z0-9_]{1,20}$'),
  sport       text NOT NULL CHECK (sport ~ '^[a-z0-9_]{1,20}$'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per marked area per check-in; all rows of one check-in share a batch id.
-- The first check-in is the baseline, the latest one is the current map.
CREATE TABLE pain_map_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  batch       uuid NOT NULL,
  area        text NOT NULL CHECK (area ~ '^[a-z_]{2,40}$'),
  score       smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pain_map_entries(patient_id, recorded_at);

ALTER TABLE patient_heroes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON patient_heroes FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (hero_name, skin, hair, outfit, sport, updated_at) ON patient_heroes TO fp_app;
-- The patient creates and edits their own hero; the professionals of the patient can look.
CREATE POLICY hero_read ON patient_heroes FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.can_manage_patient(patient_id));
CREATE POLICY hero_insert ON patient_heroes FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY hero_update ON patient_heroes FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));

ALTER TABLE pain_map_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pain_map_entries FROM PUBLIC;
GRANT SELECT, INSERT ON pain_map_entries TO fp_app;
-- Self-reported, append-only (history is kept); professionals of the patient can read it.
CREATE POLICY painmap_read ON pain_map_entries FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.can_manage_patient(patient_id));
CREATE POLICY painmap_insert ON pain_map_entries FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
