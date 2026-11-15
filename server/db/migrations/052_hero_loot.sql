-- What creatures and animals in the village drop: a count per kind of loot, kept in the backpack.
-- Play only: it buys nothing and does not touch the hero's XP or coins.
CREATE TABLE hero_loot (
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  item       text NOT NULL CHECK (item ~ '^[a-z_]{2,24}$'),
  n          integer NOT NULL DEFAULT 0 CHECK (n >= 0),
  PRIMARY KEY (patient_id, item)
);
ALTER TABLE hero_loot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_loot FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_loot TO fp_app;
CREATE POLICY loot_read ON hero_loot FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY loot_insert ON hero_loot FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY loot_update ON hero_loot FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
