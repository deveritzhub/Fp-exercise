-- The belt lists now follow the NKKO / KWF syllabus: every kyu is a grade of its own (twelve steps
-- from white to shodan instead of seven). A belt earned on the old lists becomes the striped belt
-- of the same colour, which is what it covered; ticks belonged to the old lists and are cleared.
ALTER TABLE hero_karate DROP CONSTRAINT hero_karate_belt_check;
UPDATE hero_karate SET belt = CASE belt WHEN 0 THEN 0 WHEN 6 THEN 11 ELSE belt * 2 END, done = '[]'::jsonb;
ALTER TABLE hero_karate ADD CONSTRAINT hero_karate_belt_check CHECK (belt BETWEEN 0 AND 11);
