-- Where the hero last stood in the village, so a next visit starts there and not at the well.
ALTER TABLE hero_adventure
  ADD COLUMN pos_x real CHECK (pos_x IS NULL OR (pos_x BETWEEN -60 AND 60)),
  ADD COLUMN pos_z real CHECK (pos_z IS NULL OR (pos_z BETWEEN -60 AND 60));
