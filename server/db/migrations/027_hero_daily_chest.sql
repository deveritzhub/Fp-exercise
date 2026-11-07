-- Day chest: once a day, after a daily check-in or a workout, the patient opens a chest with a few
-- coins (amount set by the server). Private to the patient, like purchases.
CREATE TABLE hero_daily_chests (
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  day        date NOT NULL,
  coins      integer NOT NULL CHECK (coins BETWEEN 1 AND 50),
  opened_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, day)
);
ALTER TABLE hero_daily_chests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_daily_chests FROM PUBLIC;
GRANT SELECT, INSERT ON hero_daily_chests TO fp_app;
CREATE POLICY chests_read ON hero_daily_chests FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY chests_insert ON hero_daily_chests FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
