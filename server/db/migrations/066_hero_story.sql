-- The story of the village ("The Chronicle of the Silent Spring", shared/story.ts): which quest is
-- open, how far it got, where a counted quest started from, and the coins the story has given.
CREATE TABLE hero_story (
  patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  step       integer NOT NULL DEFAULT 0 CHECK (step >= 0),
  count      integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  base       integer NOT NULL DEFAULT 0 CHECK (base >= 0),
  coins      integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hero_story ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_story FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON hero_story TO fp_app;
CREATE POLICY story_read ON hero_story FOR SELECT TO fp_app USING (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY story_insert ON hero_story FOR INSERT TO fp_app WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY story_update ON hero_story FOR UPDATE TO fp_app USING (patient_id IN (SELECT app.my_patient_ids())) WITH CHECK (patient_id IN (SELECT app.my_patient_ids()));
