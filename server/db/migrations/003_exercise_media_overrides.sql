-- Practice-specific video/thumbnail for any exercise (incl. the central library), without copying it.
-- The practice's own media is shown to its therapists and patients; other practices are unaffected.
CREATE TABLE exercise_media_overrides (
  practice_id        uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  exercise_id        uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  video_media_id     uuid REFERENCES media(id) ON DELETE SET NULL,
  thumbnail_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  updated_by         uuid REFERENCES users(id),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (practice_id, exercise_id)
);

ALTER TABLE exercise_media_overrides ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON exercise_media_overrides TO fp_app;

CREATE POLICY emo_read ON exercise_media_overrides FOR SELECT TO fp_app USING (
  app.is_member(practice_id) OR practice_id IN (SELECT app.my_patient_practice_ids()));
CREATE POLICY emo_insert ON exercise_media_overrides FOR INSERT TO fp_app WITH CHECK (
  app.is_member(practice_id) AND updated_by = app.uid());
CREATE POLICY emo_update ON exercise_media_overrides FOR UPDATE TO fp_app
  USING (app.is_member(practice_id)) WITH CHECK (app.is_member(practice_id) AND updated_by = app.uid());
CREATE POLICY emo_delete ON exercise_media_overrides FOR DELETE TO fp_app USING (app.is_member(practice_id));
