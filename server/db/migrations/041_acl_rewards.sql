-- Cosmetic ACL journey choices. The scar starts off. The sport kit is empty until the patient picks one.
ALTER TABLE patient_heroes
  ADD COLUMN knee_scar boolean NOT NULL DEFAULT false,
  ADD COLUMN acl_sport text CHECK (acl_sport IS NULL OR acl_sport IN ('football', 'basketball', 'hockey', 'ski', 'running', 'padel'));

GRANT UPDATE (knee_scar, acl_sport) ON patient_heroes TO fp_app;
