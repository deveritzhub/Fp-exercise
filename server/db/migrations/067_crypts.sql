-- The crypts under the village (shared/dungeon.ts): the deepest one cleared, and the run going on
-- (its seed and depth, when it began, and the chests already opened in it).
ALTER TABLE hero_adventure
  ADD COLUMN crypt_best integer NOT NULL DEFAULT 0 CHECK (crypt_best BETWEEN 0 AND 100),
  ADD COLUMN crypt_seed integer,
  ADD COLUMN crypt_depth integer CHECK (crypt_depth IS NULL OR crypt_depth BETWEEN 1 AND 100),
  ADD COLUMN crypt_started_at timestamptz,
  ADD COLUMN crypt_chests integer[] NOT NULL DEFAULT '{}';
