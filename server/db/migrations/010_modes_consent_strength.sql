-- FP app update: modes with consent per module (W01–W02), strength log (W04–W08), transition to the
-- strength module (W09), red-flag reports (W11), external ids on exercises (W14), deletion requests (W15).
--
-- Rights (from the FP spec):
--   patient           sees all own data in all modes
--   physiotherapist   'revalidatie' always; 'kracht' and 'mobiliteit' only with the patient's explicit,
--                     dated consent per module. Revoking hides the data again; it never deletes it.

-- ---------------------------------------------------------------------------
-- Modes and consent
-- ---------------------------------------------------------------------------
ALTER TABLE patients
  ADD COLUMN active_mode         text NOT NULL DEFAULT 'revalidatie' CHECK (active_mode IN ('revalidatie','kracht','mobiliteit')),
  ADD COLUMN strength_cleared_at timestamptz,          -- W09: therapist confirmed the transition checklist
  ADD COLUMN strength_cleared_by uuid REFERENCES users(id);

CREATE TABLE patient_module_consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  module      text NOT NULL CHECK (module IN ('kracht','mobiliteit')),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  uuid NOT NULL REFERENCES users(id),
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX consent_active_uq ON patient_module_consents(patient_id, module) WHERE revoked_at IS NULL;

/** True when professionals may see this patient's data of this module. */
CREATE FUNCTION app.staff_sees_module(p_patient uuid, p_module text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_module = 'revalidatie' OR EXISTS (
    SELECT 1 FROM patient_module_consents c WHERE c.patient_id = p_patient AND c.module = p_module AND c.revoked_at IS NULL)
$$;

CREATE FUNCTION app.program_module(p_program uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT module FROM programs WHERE id = p_program
$$;

CREATE FUNCTION app.session_module(p_session uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.module FROM workout_sessions s JOIN programs p ON p.id = s.program_id WHERE s.id = p_session
$$;

/** Professional access to one patient programme, respecting module consent. */
CREATE FUNCTION app.staff_can_manage_program(p_patient uuid, p_module text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.can_manage_patient(p_patient) AND app.staff_sees_module(p_patient, p_module)
$$;

CREATE OR REPLACE FUNCTION app.can_view_program(p_program uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM programs pr WHERE pr.id = p_program AND (
      (pr.is_template AND pr.practice_id IS NULL AND app.is_professional())
      OR (pr.is_template AND app.is_member(pr.practice_id))
      OR (NOT pr.is_template AND app.staff_can_manage_program(pr.patient_id, pr.module))
      OR (NOT pr.is_template AND pr.status IN ('active','completed')
          AND pr.patient_id IN (SELECT app.my_patient_ids()))
    ))
$$;

CREATE OR REPLACE FUNCTION app.can_edit_program(p_program uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM programs pr WHERE pr.id = p_program AND (
      (pr.is_template AND pr.practice_id IS NULL AND app.is_platform_admin())
      OR (pr.is_template AND pr.practice_id IS NOT NULL AND app.is_member(pr.practice_id))
      OR (NOT pr.is_template AND app.staff_can_manage_program(pr.patient_id, pr.module))
    ))
$$;

DROP POLICY prog_read ON programs;
DROP POLICY prog_insert ON programs;
DROP POLICY prog_update ON programs;
DROP POLICY prog_delete ON programs;
CREATE POLICY prog_read ON programs FOR SELECT TO fp_app USING (
  (is_template AND practice_id IS NULL AND app.is_professional())
  OR (is_template AND app.is_member(practice_id))
  OR (NOT is_template AND app.staff_can_manage_program(patient_id, module))
  OR (NOT is_template AND status IN ('active','completed','archived') AND patient_id IN (SELECT app.my_patient_ids())));
CREATE POLICY prog_insert ON programs FOR INSERT TO fp_app WITH CHECK (
  created_by = app.uid() AND (
    (is_template AND practice_id IS NULL AND app.is_platform_admin())
    OR (is_template AND app.is_member(practice_id))
    OR (NOT is_template AND app.staff_can_manage_program(patient_id, module) AND practice_id = app.patient_practice(patient_id))));
CREATE POLICY prog_update ON programs FOR UPDATE TO fp_app
  USING ((is_template AND practice_id IS NULL AND app.is_platform_admin())
         OR (is_template AND app.is_member(practice_id))
         OR (NOT is_template AND app.staff_can_manage_program(patient_id, module)))
  WITH CHECK ((is_template AND practice_id IS NULL AND app.is_platform_admin())
         OR (is_template AND app.is_member(practice_id))
         OR (NOT is_template AND app.staff_can_manage_program(patient_id, module) AND practice_id = app.patient_practice(patient_id)));
CREATE POLICY prog_delete ON programs FOR DELETE TO fp_app USING (
  (is_template AND (app.is_practice_admin(practice_id) OR (app.is_member(practice_id) AND created_by = app.uid())))
  OR (NOT is_template AND status = 'draft' AND app.staff_can_manage_program(patient_id, module)));

DROP POLICY ws_read ON workout_sessions;
DROP POLICY ws_update ON workout_sessions;
CREATE POLICY ws_read ON workout_sessions FOR SELECT TO fp_app USING (
  app.staff_can_manage_program(patient_id, app.program_module(program_id)) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY ws_update ON workout_sessions FOR UPDATE TO fp_app
  USING (app.staff_can_manage_program(patient_id, app.program_module(program_id)) OR patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (app.staff_can_manage_program(patient_id, app.program_module(program_id)) OR patient_id IN (SELECT app.my_patient_ids()));

DROP POLICY logs_read ON exercise_logs;
CREATE POLICY logs_read ON exercise_logs FOR SELECT TO fp_app USING (
  app.staff_can_manage_program(patient_id, app.session_module(session_id)) OR patient_id IN (SELECT app.my_patient_ids()));

ALTER TABLE patient_module_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON patient_module_consents FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (revoked_at, revoked_by) ON patient_module_consents TO fp_app;
-- Only the patient grants or revokes; professionals can read the record (to know what they may see).
CREATE POLICY consent_read ON patient_module_consents FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY consent_insert ON patient_module_consents FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND granted_by = app.uid() AND practice_id = app.patient_practice(patient_id) AND revoked_at IS NULL);
CREATE POLICY consent_revoke ON patient_module_consents FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()) AND revoked_at IS NULL)
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND revoked_by = app.uid());

-- Staff may set the strength clearance (W09) on patients they manage.
GRANT UPDATE (strength_cleared_at, strength_cleared_by) ON patients TO fp_app;

/** Patient switches the app mode (stored per patient; switching never deletes data). */
CREATE FUNCTION app.set_active_mode(p_mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_mode NOT IN ('revalidatie','kracht','mobiliteit') THEN RAISE EXCEPTION 'invalid mode' USING ERRCODE = '22023'; END IF;
  UPDATE patients SET active_mode = p_mode WHERE user_id = app.uid() AND archived_at IS NULL;
END $$;

/**
 * Patient starts a kracht/mobiliteit programme from a template of their practice (self-directed modules).
 * 'kracht' requires the therapist's transition clearance (W09). Rehab programmes are always set by the therapist.
 */
CREATE FUNCTION app.patient_start_program(p_template uuid, p_start date) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pt patients%ROWTYPE;
  tp programs%ROWTYPE;
  new_id uuid := gen_random_uuid();
BEGIN
  SELECT * INTO pt FROM patients WHERE user_id = app.uid() AND archived_at IS NULL;
  IF pt.id IS NULL THEN RAISE EXCEPTION 'not a patient' USING ERRCODE = '42501'; END IF;
  SELECT * INTO tp FROM programs WHERE id = p_template AND is_template AND status <> 'archived'
    AND (practice_id = pt.practice_id OR practice_id IS NULL);
  IF tp.id IS NULL OR tp.module NOT IN ('kracht','mobiliteit') THEN RAISE EXCEPTION 'template not available' USING ERRCODE = '42501'; END IF;
  IF tp.module = 'kracht' AND pt.strength_cleared_at IS NULL THEN RAISE EXCEPTION 'strength not cleared' USING ERRCODE = 'P0001', HINT = 'strength_not_cleared'; END IF;
  INSERT INTO programs(id, practice_id, patient_id, is_template, title, description, patient_instructions, status, start_date,
                       source_template_id, created_by, activated_at, module, series_key, series_title, indication, phase_no,
                       phase_count, phase_name, phase_weeks, phase_goal, criteria, red_flags, warnings, evidence)
  VALUES (new_id, pt.practice_id, pt.id, false, tp.title, '', tp.patient_instructions, 'active', p_start, tp.id, app.uid(), now(),
          tp.module, tp.series_key, tp.series_title, tp.indication, tp.phase_no, tp.phase_count, tp.phase_name, tp.phase_weeks,
          tp.phase_goal, tp.criteria, tp.red_flags, tp.warnings, tp.evidence);
  INSERT INTO program_items(program_id, practice_id, exercise_id, alternative_exercise_id, position, sets, reps, hold_s, rest_s,
                            tempo, load, frequency, days, notes)
  SELECT new_id, pt.practice_id, exercise_id, alternative_exercise_id, position, sets, reps, hold_s, rest_s, tempo, load, frequency, days, notes
    FROM program_items WHERE program_id = tp.id;
  RETURN new_id;
END $$;

/** Patient stops a programme they started themselves (kept for history, never deleted). */
CREATE FUNCTION app.patient_stop_program(p_program uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH u AS (
    UPDATE programs SET status = 'archived', updated_at = now()
     WHERE id = p_program AND created_by = app.uid() AND patient_id IN (SELECT app.my_patient_ids()) AND status = 'active'
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u)
$$;

-- ---------------------------------------------------------------------------
-- Strength log (W04): one row per set
-- ---------------------------------------------------------------------------
CREATE TABLE strength_sets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  practice_id     uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_item_id uuid REFERENCES program_items(id) ON DELETE SET NULL,
  exercise_id     uuid NOT NULL REFERENCES exercises(id),
  set_no          smallint NOT NULL CHECK (set_no BETWEEN 1 AND 30),
  weight_kg       numeric(6,2) CHECK (weight_kg BETWEEN 0 AND 1000),
  reps            smallint CHECK (reps BETWEEN 0 AND 200),
  rpe             numeric(3,1) CHECK (rpe BETWEEN 1 AND 10),
  rir             smallint CHECK (rir BETWEEN 0 AND 10),
  pain            smallint CHECK (pain BETWEEN 0 AND 10),
  note            text CHECK (length(note) <= 300),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, program_item_id, set_no)
);
CREATE INDEX ON strength_sets(patient_id, exercise_id, created_at DESC);

-- Direct 1RM tests and their safety screening (W08).
CREATE TABLE one_rm_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  exercise_id  uuid NOT NULL REFERENCES exercises(id),
  screening_ok boolean NOT NULL,
  weight_kg    numeric(6,2) CHECK (weight_kg BETWEEN 0 AND 1000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (screening_ok OR weight_kg IS NULL)
);
CREATE INDEX ON one_rm_tests(patient_id, exercise_id, created_at DESC);

ALTER TABLE strength_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_rm_tests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strength_sets, one_rm_tests FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON strength_sets TO fp_app;
GRANT SELECT, INSERT ON one_rm_tests TO fp_app;
CREATE POLICY sets_read ON strength_sets FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.staff_can_manage_program(patient_id, 'kracht'));
CREATE POLICY sets_write ON strength_sets FOR ALL TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND app.session_patient(session_id) = patient_id
              AND practice_id = app.patient_practice(patient_id));
CREATE POLICY onerm_read ON one_rm_tests FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.staff_can_manage_program(patient_id, 'kracht'));
CREATE POLICY onerm_insert ON one_rm_tests FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id)
  AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_id AND p.patient_id = one_rm_tests.patient_id));

-- ---------------------------------------------------------------------------
-- Transition checklist rehab → strength (W09), ticked by the therapist
-- ---------------------------------------------------------------------------
CREATE TABLE strength_transition_checks (
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  item_no     smallint NOT NULL CHECK (item_no BETWEEN 0 AND 19),
  label       text NOT NULL CHECK (length(label) <= 300),
  checked_by  uuid NOT NULL REFERENCES users(id),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, item_no)
);
ALTER TABLE strength_transition_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strength_transition_checks FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON strength_transition_checks TO fp_app;
CREATE POLICY trans_read ON strength_transition_checks FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY trans_write ON strength_transition_checks FOR INSERT TO fp_app WITH CHECK (
  app.can_manage_patient(patient_id) AND checked_by = app.uid() AND practice_id = app.patient_practice(patient_id));
CREATE POLICY trans_delete ON strength_transition_checks FOR DELETE TO fp_app USING (app.can_manage_patient(patient_id));

-- ---------------------------------------------------------------------------
-- Red-flag reports (W11). Sent deliberately by the patient to the practice, so professionals who manage
-- the patient see them whatever the module consent (safety). The programme is paused until handled.
-- ---------------------------------------------------------------------------
CREATE TABLE red_flag_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  session_id   uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  flags        jsonb NOT NULL DEFAULT '[]'::jsonb,
  note         text CHECK (length(note) <= 1000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  handled_at   timestamptz,
  handled_by   uuid REFERENCES users(id),
  handled_note text CHECK (length(handled_note) <= 1000)
);
CREATE INDEX ON red_flag_reports(practice_id, created_at DESC);
CREATE INDEX ON red_flag_reports(program_id) WHERE handled_at IS NULL;
ALTER TABLE red_flag_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON red_flag_reports FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (handled_at, handled_by, handled_note) ON red_flag_reports TO fp_app;
CREATE POLICY rf_read ON red_flag_reports FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY rf_insert ON red_flag_reports FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id) AND handled_at IS NULL
  AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_id AND p.patient_id = red_flag_reports.patient_id));
CREATE POLICY rf_handle ON red_flag_reports FOR UPDATE TO fp_app
  USING (app.can_manage_patient(patient_id)) WITH CHECK (app.can_manage_patient(patient_id) AND handled_by = app.uid());

-- ---------------------------------------------------------------------------
-- W14: external references on exercises, stored only (no integration in this version)
-- W15: deletion requests from patients
-- ---------------------------------------------------------------------------
ALTER TABLE exercises
  ADD COLUMN physitrack_id      text CHECK (length(physitrack_id) <= 80),
  ADD COLUMN external_video_url text CHECK (length(external_video_url) <= 500 AND external_video_url ~ '^https://');

CREATE TABLE deletion_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id),
  reason       text CHECK (length(reason) <= 1000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  handled_at   timestamptz,
  handled_by   uuid REFERENCES users(id),
  outcome      text CHECK (outcome IN ('deleted','declined')),
  outcome_note text CHECK (length(outcome_note) <= 1000)
);
CREATE UNIQUE INDEX deletion_open_uq ON deletion_requests(patient_id) WHERE handled_at IS NULL;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON deletion_requests FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE (handled_at, handled_by, outcome, outcome_note) ON deletion_requests TO fp_app;
CREATE POLICY del_read ON deletion_requests FOR SELECT TO fp_app USING (
  patient_id IN (SELECT app.my_patient_ids()) OR app.is_practice_admin(practice_id));
CREATE POLICY del_insert ON deletion_requests FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids()) AND requested_by = app.uid() AND practice_id = app.patient_practice(patient_id) AND handled_at IS NULL);
CREATE POLICY del_handle ON deletion_requests FOR UPDATE TO fp_app
  USING (app.is_practice_admin(practice_id)) WITH CHECK (app.is_practice_admin(practice_id) AND handled_by = app.uid());

/**
 * Carries out a patient's deletion request (practice owner/admin only). Deletes the patient record and
 * everything that hangs off it (programmes, sessions, logs, sets, consents, reports). Returns the patient's
 * login id so the auth service can erase the account. The audit log keeps that it happened (ids only).
 */
CREATE FUNCTION app.delete_patient_on_request(p_request uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  r deletion_requests%ROWTYPE;
  login uuid;
BEGIN
  SELECT * INTO r FROM deletion_requests WHERE id = p_request AND handled_at IS NULL;
  IF r.id IS NULL OR NOT app.is_practice_admin(r.practice_id) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  SELECT user_id INTO login FROM patients WHERE id = r.patient_id;
  DELETE FROM patients WHERE id = r.patient_id;
  RETURN login;
END $$;
REVOKE ALL ON FUNCTION app.delete_patient_on_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.delete_patient_on_request(uuid) TO fp_app;

REVOKE ALL ON FUNCTION app.staff_sees_module(uuid, text), app.program_module(uuid), app.session_module(uuid),
  app.staff_can_manage_program(uuid, text), app.set_active_mode(text), app.patient_start_program(uuid, date),
  app.patient_stop_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.staff_sees_module(uuid, text), app.program_module(uuid), app.session_module(uuid),
  app.staff_can_manage_program(uuid, text), app.set_active_mode(text), app.patient_start_program(uuid, date),
  app.patient_stop_program(uuid) TO fp_app;
