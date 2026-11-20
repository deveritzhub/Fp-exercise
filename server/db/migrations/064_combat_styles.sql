-- Three ways to fight in the village (close by, with a bow, with magic), each a skill with its own
-- XP, and the arrows and runes that bows and magic use up.
ALTER TABLE hero_adventure
  ADD COLUMN melee_xp integer NOT NULL DEFAULT 0 CHECK (melee_xp >= 0),
  ADD COLUMN ranged_xp integer NOT NULL DEFAULT 0 CHECK (ranged_xp >= 0),
  ADD COLUMN magic_xp integer NOT NULL DEFAULT 0 CHECK (magic_xp >= 0),
  ADD COLUMN arrows integer NOT NULL DEFAULT 0 CHECK (arrows BETWEEN 0 AND 1000),
  ADD COLUMN runes integer NOT NULL DEFAULT 0 CHECK (runes BETWEEN 0 AND 1000);
