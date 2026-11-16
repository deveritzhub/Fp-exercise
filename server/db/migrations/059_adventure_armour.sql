-- The armour the hero wears in the village: made from loot (hero_purchases, keys 'built_<armour>'),
-- put on or off by the patient; NULL means none. It softens the blows of creatures. Play only.
ALTER TABLE hero_adventure ADD COLUMN armour text CHECK (armour IS NULL OR armour ~ '^[a-z_]{2,24}$');
