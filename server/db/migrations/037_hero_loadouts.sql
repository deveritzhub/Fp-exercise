-- Three patient-owned cosmetic wardrobe slots. No clinical measures or friend sharing.
-- RLS intentionally does not grant professional access to personal outfit preferences.
CREATE TABLE hero_loadouts (
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  gear text[] NOT NULL DEFAULT '{}' CHECK (cardinality(gear) <= 12),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, slot)
);
ALTER TABLE hero_loadouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_loadouts FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (gear, updated_at) ON hero_loadouts TO fp_app;

CREATE POLICY hero_loadouts_select ON hero_loadouts FOR SELECT TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY hero_loadouts_insert ON hero_loadouts FOR INSERT TO fp_app
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY hero_loadouts_update ON hero_loadouts FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));

-- Account deletion cascades and the patient data export includes these slots.
