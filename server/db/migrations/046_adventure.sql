-- Play in the village: creatures beaten, with XP of its own. Apart from the hero's XP on purpose:
-- that stands for real exercise and habits, and nothing here feeds it.
CREATE TABLE hero_adventure (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  xp         integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  wins       integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
  day        date NOT NULL DEFAULT CURRENT_DATE,
  wins_today integer NOT NULL DEFAULT 0 CHECK (wins_today >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hero_adventure ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_adventure FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_adventure TO fp_app;
CREATE POLICY adventure_read ON hero_adventure FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY adventure_insert ON hero_adventure FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY adventure_update ON hero_adventure FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
