-- The adventure's task of the day (which one follows from the date): how far it got today, and
-- whether its reward was given. Play only, like the rest of the adventure.
ALTER TABLE hero_adventure
  ADD COLUMN quest_day  date,
  ADD COLUMN quest_n    integer NOT NULL DEFAULT 0 CHECK (quest_n >= 0),
  ADD COLUMN quest_done boolean NOT NULL DEFAULT false;
-- A chest made from loot is also a piece of furniture for the home: those who made one already get it.
INSERT INTO hero_purchases (patient_id, item, price)
  SELECT patient_id, 'home_lootchest', 0 FROM hero_purchases WHERE item = 'built_chest'
  ON CONFLICT DO NOTHING;
