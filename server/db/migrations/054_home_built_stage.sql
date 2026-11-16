-- The own home is built with loot from the village (wood, stone, hides, ...), no longer only by level.
-- built_stage is the home that stands (0 = camp … 5 = villa). NULL: not set yet; the first read sets it
-- to the home the level already gave, so nobody loses the house they had. Additive, non-destructive.
ALTER TABLE hero_homes ADD COLUMN built_stage smallint CHECK (built_stage BETWEEN 0 AND 5);
