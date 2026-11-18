-- A pet that walks with the hero through the village (from adventure level 2): the breed, its coat
-- and the name the patient gave it.
ALTER TABLE hero_adventure
  ADD COLUMN pet text CHECK (pet IS NULL OR pet ~ '^[a-z]{2,24}$'),
  ADD COLUMN pet_coat smallint NOT NULL DEFAULT 0 CHECK (pet_coat BETWEEN 0 AND 9),
  ADD COLUMN pet_name text CHECK (pet_name IS NULL OR char_length(pet_name) BETWEEN 1 AND 20);
