-- Clinical review of exercise content, per practice: a registered physiotherapist of the practice
-- confirms the instructions (and media) are clinically correct for use with their patients.
CREATE TABLE exercise_reviews (
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reviewed_by uuid NOT NULL REFERENCES users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  note        text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  PRIMARY KEY (practice_id, exercise_id)
);

ALTER TABLE exercise_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON exercise_reviews TO fp_app;

CREATE POLICY rev_read ON exercise_reviews FOR SELECT TO fp_app USING (app.is_member(practice_id));
CREATE POLICY rev_insert ON exercise_reviews FOR INSERT TO fp_app
  WITH CHECK (app.is_member(practice_id) AND reviewed_by = app.uid());
CREATE POLICY rev_update ON exercise_reviews FOR UPDATE TO fp_app
  USING (app.is_member(practice_id)) WITH CHECK (app.is_member(practice_id) AND reviewed_by = app.uid());
CREATE POLICY rev_delete ON exercise_reviews FOR DELETE TO fp_app USING (app.is_member(practice_id));
