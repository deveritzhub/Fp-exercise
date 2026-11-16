-- Rounds on the bag in the boxing school: how many gave XP today (the first few a day do).
ALTER TABLE hero_adventure ADD COLUMN rounds_today integer NOT NULL DEFAULT 0 CHECK (rounds_today >= 0);
