-- The grooming salon: the colour of the pet's collar (and what it wears), and what it wears (bought
-- once with coins, kept in hero_purchases as petwear_<key>).
ALTER TABLE hero_adventure
  ADD COLUMN pet_color text CHECK (pet_color IS NULL OR pet_color ~ '^[a-z]{2,16}$'),
  ADD COLUMN pet_wear text CHECK (pet_wear IS NULL OR pet_wear ~ '^[a-z]{2,16}$');
