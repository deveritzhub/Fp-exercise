-- The little games next to the village: per patient and game the best score, how many rounds were
-- played, and how many rounds today gave XP (a few a day do). Play only; private to the patient.
CREATE TABLE hero_minigames (
  patient_id     uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  game           text NOT NULL CHECK (game ~ '^[a-z_]{2,24}$'),
  best           integer NOT NULL DEFAULT 0 CHECK (best >= 0),
  plays          integer NOT NULL DEFAULT 0 CHECK (plays >= 0),
  day            date NOT NULL DEFAULT CURRENT_DATE,
  rewarded_today integer NOT NULL DEFAULT 0 CHECK (rewarded_today >= 0),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, game)
);
ALTER TABLE hero_minigames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_minigames FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_minigames TO fp_app;
CREATE POLICY minigames_read ON hero_minigames FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY minigames_insert ON hero_minigames FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY minigames_update ON hero_minigames FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
