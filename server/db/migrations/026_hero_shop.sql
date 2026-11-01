-- Hero shop: gear is bought with coins earned by training instead of unlocked by levels.
-- Coins earned are derived from hero XP (never stored); this table holds what was spent.
-- Private to the patient: professionals and friends cannot read purchases or the balance.
CREATE TABLE hero_purchases (
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  item       text NOT NULL CHECK (item ~ '^[a-z_]{2,32}$'),
  price      integer NOT NULL CHECK (price >= 0),
  bought_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, item)
);
ALTER TABLE hero_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_purchases FROM PUBLIC;
GRANT SELECT, INSERT ON hero_purchases TO fp_app;
CREATE POLICY purchases_read ON hero_purchases FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY purchases_insert ON hero_purchases FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));

-- Nobody loses what they wear today: items currently worn become owned, for free.
INSERT INTO hero_purchases (patient_id, item, price)
SELECT DISTINCT patient_id, g, 0 FROM patient_heroes, unnest(gear) AS g WHERE g ~ '^[a-z_]{2,32}$'
ON CONFLICT DO NOTHING;
