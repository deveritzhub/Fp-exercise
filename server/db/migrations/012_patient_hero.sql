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
  frame       text NOT NULL DEFAULT 'f' CHECK (frame ~ '^[a-z0-9_]{1,20}$'),
  build       text NOT NULL DEFAULT 'average' CHECK (build ~ '^[a-z0-9_]{1,20}$'),
  hair_color  text NOT NULL DEFAULT 'darkbrown' CHECK (hair_color ~ '^[a-z0-9_]{1,20}$'),
  eye_color   text NOT NULL DEFAULT 'brown' CHECK (eye_color ~ '^[a-z0-9_]{1,20}$'),
  beard       text NOT NULL DEFAULT 'none' CHECK (beard ~ '^[a-z0-9_]{1,20}$'),
  glasses     text NOT NULL DEFAULT 'none' CHECK (glasses ~ '^[a-z0-9_]{1,20}$'),
  gear        text[] NOT NULL DEFAULT '{}' CHECK (cardinality(gear) <= 10),
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
GRANT SELECT, INSERT, UPDATE (hero_name, skin, hair, outfit, sport, frame, build, hair_color, eye_color, beard, glasses, gear, updated_at) ON patient_heroes TO fp_app;
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

-- The phases (route) of the patient's own phased programme, for the quest view: names, weeks and
-- goals of the series templates of their practice (or the central library). Read-only metadata.
CREATE FUNCTION app.patient_series_phases(p_series text)
RETURNS TABLE (phase_no int, phase_name text, phase_weeks text, phase_goal text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT DISTINCT ON (p.phase_no) p.phase_no::int, p.phase_name, p.phase_weeks, p.phase_goal
    FROM programs p
    JOIN patients pt ON pt.user_id = app.uid() AND pt.archived_at IS NULL
   WHERE p.is_template AND p.series_key = p_series AND p.phase_no IS NOT NULL
     AND (p.practice_id = pt.practice_id OR p.practice_id IS NULL)
   ORDER BY p.phase_no, (p.practice_id IS NULL), p.updated_at DESC
$$;
REVOKE EXECUTE ON FUNCTION app.patient_series_phases(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.patient_series_phases(text) TO fp_app;

-- Daily check-in: one quick score per day for the main sore area (or 'general'); feeds the pain trend.
CREATE TABLE daily_checkins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  day         date NOT NULL,
  area        text NOT NULL CHECK (area ~ '^[a-z_]{2,40}$'),
  score       smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, day)
);
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_checkins FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (area, score) ON daily_checkins TO fp_app;
CREATE POLICY checkin_read ON daily_checkins FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.can_manage_patient(patient_id));
CREATE POLICY checkin_insert ON daily_checkins FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));
CREATE POLICY checkin_update ON daily_checkins FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
