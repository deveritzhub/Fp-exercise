-- Phased programmes (series → phase), modules, and criteria checklists per patient programme.
-- Templates carry the structure; a patient programme created from a template copies it, so the
-- therapist sees the criteria for the next phase while treating. Progression is never automatic.

ALTER TABLE programs
  ADD COLUMN module        text NOT NULL DEFAULT 'revalidatie' CHECK (module IN ('revalidatie','kracht','mobiliteit')),
  ADD COLUMN series_key    text CHECK (length(series_key) <= 80),
  ADD COLUMN series_title  text CHECK (length(series_title) <= 160),
  ADD COLUMN indication    text NOT NULL DEFAULT '' CHECK (length(indication) <= 500),
  ADD COLUMN phase_no      smallint CHECK (phase_no BETWEEN 1 AND 20),
  ADD COLUMN phase_count   smallint CHECK (phase_count BETWEEN 1 AND 20),
  ADD COLUMN phase_name    text CHECK (length(phase_name) <= 60),
  ADD COLUMN phase_weeks   text CHECK (length(phase_weeks) <= 20),
  ADD COLUMN phase_goal    text CHECK (length(phase_goal) <= 500),
  -- [{ "to": "Fase 2", "title": "...", "items": [{ "label", "threshold", "test", "source" }] }]
  ADD COLUMN criteria      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN red_flags     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN warnings      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN evidence      text NOT NULL DEFAULT '' CHECK (length(evidence) <= 2000);
CREATE INDEX programs_series_idx ON programs(practice_id, series_key) WHERE series_key IS NOT NULL;

-- A therapist ticks a criterion for one patient programme (with name and date). Undo = delete.
CREATE TABLE program_criteria_checks (
  program_id  uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  item_key    text NOT NULL CHECK (item_key ~ '^[0-9]{1,2}\.[0-9]{1,2}$'),   -- "group.item"
  label       text NOT NULL CHECK (length(label) <= 300),                     -- snapshot of the criterion
  note        text NOT NULL DEFAULT '' CHECK (length(note) <= 300),            -- e.g. measured value
  checked_by  uuid NOT NULL REFERENCES users(id),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, item_key)
);
ALTER TABLE program_criteria_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON program_criteria_checks FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON program_criteria_checks TO fp_app;
-- Staff who may edit the programme; patients never see the checklist.
CREATE POLICY crit_read ON program_criteria_checks FOR SELECT TO fp_app USING (app.can_edit_program(program_id) AND app.is_professional());
CREATE POLICY crit_insert ON program_criteria_checks FOR INSERT TO fp_app WITH CHECK (
  app.can_edit_program(program_id) AND app.is_professional() AND checked_by = app.uid()
  AND practice_id = app.program_practice(program_id));
CREATE POLICY crit_update ON program_criteria_checks FOR UPDATE TO fp_app
  USING (app.can_edit_program(program_id) AND app.is_professional())
  WITH CHECK (app.can_edit_program(program_id) AND app.is_professional() AND checked_by = app.uid()
              AND practice_id = app.program_practice(program_id));
CREATE POLICY crit_delete ON program_criteria_checks FOR DELETE TO fp_app USING (app.can_edit_program(program_id) AND app.is_professional());

-- Which library bundles were loaded into a practice (so start-up imports run once per version).
CREATE TABLE library_imports (
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  bundle      text NOT NULL CHECK (length(bundle) <= 80),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (practice_id, bundle)
);
ALTER TABLE library_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON library_imports FROM PUBLIC;
