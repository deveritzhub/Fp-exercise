-- The weapon the hero carries in the village. Weapons are bought with coins (hero_purchases, keys
-- 'wpn_<weapon>') and put on or off by the patient; NULL means bare fists.
ALTER TABLE hero_adventure ADD COLUMN weapon text CHECK (weapon IS NULL OR weapon ~ '^[a-z_]{2,24}$');
