-- FP Exercise — authorisation layer (row level security)
--
-- Roles
--   fp_owner : owns all objects; runs migrations. Table owner => bypasses RLS (no FORCE).
--   fp_app   : runtime API role. Every request runs in a transaction with
--              set_config('app.user_id', <verified session user>, true). RLS enforces tenant
--              isolation and assignment-based access even if API code has a bug.
--   fp_auth  : runtime auth service role (login, sessions, tokens, account creation on invite).
--              Narrow grants, confined to server/src/auth.
--
-- Helper functions are SECURITY DEFINER (run as fp_owner) so policies can look up memberships
-- without recursive RLS evaluation. They only ever answer questions about the *current* user.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fp_app') THEN CREATE ROLE fp_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fp_auth') THEN CREATE ROLE fp_auth NOLOGIN; END IF;
END $$;

CREATE FUNCTION app.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

CREATE FUNCTION app.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((SELECT is_platform_admin FROM users WHERE id = app.uid() AND disabled_at IS NULL), false)
$$;

CREATE FUNCTION app.is_member(p_practice uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM practice_members m JOIN practices p ON p.id = m.practice_id
                 WHERE m.practice_id = p_practice AND m.user_id = app.uid() AND m.active AND p.archived_at IS NULL)
$$;

CREATE FUNCTION app.is_practice_admin(p_practice uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM practice_members m JOIN practices p ON p.id = m.practice_id
                 WHERE m.practice_id = p_practice AND m.user_id = app.uid() AND m.active
                   AND m.role IN ('owner','admin') AND p.archived_at IS NULL)
$$;

CREATE FUNCTION app.is_professional() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM practice_members WHERE user_id = app.uid() AND active)
$$;

-- Patient records linked to the current login (normally 0 or 1)
CREATE FUNCTION app.my_patient_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id FROM patients WHERE user_id = app.uid() AND archived_at IS NULL
$$;

CREATE FUNCTION app.my_patient_practice_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT practice_id FROM patients WHERE user_id = app.uid() AND archived_at IS NULL
$$;

CREATE FUNCTION app.patient_practice(p_patient uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT practice_id FROM patients WHERE id = p_patient
$$;

-- Professional access to a patient: practice owner/admin, or an assigned therapist
CREATE FUNCTION app.can_manage_patient(p_patient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM patients pt
    WHERE pt.id = p_patient
      AND (app.is_practice_admin(pt.practice_id)
           OR (app.is_member(pt.practice_id) AND EXISTS (
                 SELECT 1 FROM patient_therapists a WHERE a.patient_id = pt.id AND a.therapist_id = app.uid())))
  )
$$;

CREATE FUNCTION app.can_access_patient(p_patient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.can_manage_patient(p_patient) OR p_patient IN (SELECT app.my_patient_ids())
$$;

CREATE FUNCTION app.patient_has_therapist(p_patient uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM patient_therapists WHERE patient_id = p_patient)
$$;

CREATE FUNCTION app.is_active_member(p_user uuid, p_practice uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM practice_members WHERE user_id = p_user AND practice_id = p_practice AND active)
$$;

-- Who may see another user's (minimal) profile
CREATE FUNCTION app.can_see_user(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_user = app.uid()
    -- colleagues in a shared practice
    OR EXISTS (SELECT 1 FROM practice_members a JOIN practice_members b ON a.practice_id = b.practice_id
               WHERE a.user_id = app.uid() AND a.active AND b.user_id = p_user)
    -- a patient account that I manage
    OR EXISTS (SELECT 1 FROM patients pt WHERE pt.user_id = p_user AND app.can_manage_patient(pt.id))
    -- a patient may see their assigned therapists
    OR EXISTS (SELECT 1 FROM patient_therapists a WHERE a.therapist_id = p_user
               AND a.patient_id IN (SELECT app.my_patient_ids()))
    -- platform admin may see practice staff (never patients)
    OR (app.is_platform_admin() AND EXISTS (SELECT 1 FROM practice_members WHERE user_id = p_user))
$$;

CREATE FUNCTION app.program_practice(p_program uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT practice_id FROM programs WHERE id = p_program
$$;

CREATE FUNCTION app.can_view_program(p_program uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM programs pr WHERE pr.id = p_program AND (
      (pr.is_template AND pr.practice_id IS NULL AND app.is_professional())
      OR (pr.is_template AND app.is_member(pr.practice_id))
      OR (NOT pr.is_template AND app.can_manage_patient(pr.patient_id))
      OR (NOT pr.is_template AND pr.status IN ('active','completed')
          AND pr.patient_id IN (SELECT app.my_patient_ids()))
    ))
$$;

CREATE FUNCTION app.can_edit_program(p_program uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM programs pr WHERE pr.id = p_program AND (
      (pr.is_template AND pr.practice_id IS NULL AND app.is_platform_admin())
      OR (pr.is_template AND pr.practice_id IS NOT NULL AND app.is_member(pr.practice_id))
      OR (NOT pr.is_template AND app.can_manage_patient(pr.patient_id))
    ))
$$;

CREATE FUNCTION app.session_patient(p_session uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT patient_id FROM workout_sessions WHERE id = p_session
$$;

-- Whether a (visible) user has completed account activation; avoids exposing password_hash.
CREATE FUNCTION app.user_activated(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.can_see_user(p_user) AND EXISTS (SELECT 1 FROM users WHERE id = p_user AND password_hash IS NOT NULL)
$$;

-- Aggregated, non-clinical statistics for the platform administrator.
CREATE FUNCTION app.platform_practice_overview()
RETURNS TABLE (id uuid, name text, slug text, city text, plan_code text, subscription_status text,
               created_at timestamptz, archived_at timestamptz, members bigint, active_patients bigint, custom_exercises bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT app.is_platform_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT p.id, p.name, p.slug, p.city, p.plan_code, p.subscription_status, p.created_at, p.archived_at,
      (SELECT count(*) FROM practice_members m WHERE m.practice_id = p.id AND m.active),
      (SELECT count(*) FROM patients x WHERE x.practice_id = p.id AND x.archived_at IS NULL),
      (SELECT count(*) FROM exercises e WHERE e.practice_id = p.id AND e.archived_at IS NULL)
    FROM practices p ORDER BY p.created_at;
END $$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Grants (least privilege). Nothing is granted to PUBLIC.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA public, app TO fp_app, fp_auth;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO fp_app, fp_auth;

GRANT SELECT ON plans TO fp_app;
GRANT SELECT, INSERT, UPDATE ON practices TO fp_app;
-- Column-level: the runtime role can never read password hashes or lockout state.
GRANT SELECT (id, email, full_name, locale, is_platform_admin, email_verified_at, mfa_enabled, created_at, disabled_at),
      UPDATE (full_name, locale) ON users TO fp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON practice_members TO fp_app;
GRANT SELECT, INSERT, UPDATE ON patients TO fp_app;
GRANT SELECT, INSERT, DELETE ON patient_therapists TO fp_app;
GRANT SELECT, INSERT, DELETE ON media TO fp_app;
GRANT SELECT, INSERT, UPDATE ON exercises TO fp_app;
GRANT SELECT, INSERT, UPDATE ON exercise_clinical_notes TO fp_app;
GRANT SELECT, INSERT, DELETE ON exercise_relations TO fp_app;
GRANT SELECT, INSERT, DELETE ON exercise_favorites TO fp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON programs TO fp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON program_items TO fp_app;
GRANT SELECT, INSERT ON program_versions TO fp_app;
GRANT SELECT, INSERT, DELETE ON template_favorites TO fp_app;
GRANT SELECT, INSERT, UPDATE ON workout_sessions TO fp_app;
GRANT SELECT, INSERT, UPDATE ON exercise_logs TO fp_app;
GRANT SELECT, INSERT, UPDATE (read_at) ON notifications TO fp_app;
GRANT SELECT, INSERT ON audit_log TO fp_app;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO fp_app, fp_auth;
GRANT INSERT ON contact_requests TO fp_app;

-- auth service role
GRANT SELECT, INSERT, UPDATE ON users TO fp_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions, auth_tokens TO fp_auth;
GRANT SELECT, INSERT ON mail_outbox TO fp_auth;
GRANT SELECT, UPDATE (user_id) ON patients TO fp_auth;
GRANT SELECT ON practice_members, practices TO fp_auth;
GRANT INSERT ON audit_log TO fp_auth;

CREATE POLICY auth_users ON users TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_sessions_all ON auth_sessions TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_tokens_all ON auth_tokens TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_outbox ON mail_outbox TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_patients ON patients TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_members ON practice_members FOR SELECT TO fp_auth USING (true);
CREATE POLICY auth_practices ON practices FOR SELECT TO fp_auth USING (true);
CREATE POLICY auth_audit ON audit_log FOR INSERT TO fp_auth WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Policies for fp_app
-- ---------------------------------------------------------------------------
CREATE POLICY plans_read ON plans FOR SELECT TO fp_app USING (true);

-- practices
CREATE POLICY practices_read ON practices FOR SELECT TO fp_app USING (
  app.is_member(id) OR id IN (SELECT app.my_patient_practice_ids()) OR app.is_platform_admin());
CREATE POLICY practices_insert ON practices FOR INSERT TO fp_app WITH CHECK (app.is_platform_admin());
CREATE POLICY practices_update ON practices FOR UPDATE TO fp_app
  USING (app.is_practice_admin(id) OR app.is_platform_admin())
  WITH CHECK (app.is_practice_admin(id) OR app.is_platform_admin());

-- users
CREATE POLICY users_read ON users FOR SELECT TO fp_app USING (app.can_see_user(id));
CREATE POLICY users_update_self ON users FOR UPDATE TO fp_app USING (id = app.uid()) WITH CHECK (id = app.uid());

-- practice members
CREATE POLICY members_read ON practice_members FOR SELECT TO fp_app USING (
  app.is_member(practice_id) OR app.is_platform_admin() OR user_id = app.uid()
  OR (practice_id IN (SELECT app.my_patient_practice_ids())));
CREATE POLICY members_write ON practice_members FOR INSERT TO fp_app
  WITH CHECK (app.is_practice_admin(practice_id) OR app.is_platform_admin());
CREATE POLICY members_update ON practice_members FOR UPDATE TO fp_app
  USING (app.is_practice_admin(practice_id)) WITH CHECK (app.is_practice_admin(practice_id));
CREATE POLICY members_delete ON practice_members FOR DELETE TO fp_app USING (app.is_practice_admin(practice_id));

-- patients (platform admin deliberately has NO access)
CREATE POLICY patients_read ON patients FOR SELECT TO fp_app USING (app.can_access_patient(id));
CREATE POLICY patients_insert ON patients FOR INSERT TO fp_app
  WITH CHECK (app.is_member(practice_id) AND created_by = app.uid() AND user_id IS NULL);
CREATE POLICY patients_update ON patients FOR UPDATE TO fp_app
  USING (app.can_manage_patient(id)) WITH CHECK (app.can_manage_patient(id));

-- therapist assignment
CREATE POLICY pt_read ON patient_therapists FOR SELECT TO fp_app USING (
  app.is_member(practice_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY pt_insert ON patient_therapists FOR INSERT TO fp_app WITH CHECK (
  practice_id = app.patient_practice(patient_id)
  AND app.is_active_member(therapist_id, practice_id)
  AND (app.is_practice_admin(practice_id)
       OR app.can_manage_patient(patient_id)
       -- the creating therapist may claim a brand-new, unassigned patient
       OR (therapist_id = app.uid() AND app.is_member(practice_id) AND NOT app.patient_has_therapist(patient_id))));
CREATE POLICY pt_delete ON patient_therapists FOR DELETE TO fp_app USING (
  app.is_practice_admin(practice_id) OR app.can_manage_patient(patient_id));

-- media
CREATE POLICY media_read ON media FOR SELECT TO fp_app USING (
  (practice_id IS NULL AND app.uid() IS NOT NULL)
  OR app.is_member(practice_id)
  OR practice_id IN (SELECT app.my_patient_practice_ids()));
CREATE POLICY media_insert ON media FOR INSERT TO fp_app WITH CHECK (
  uploaded_by = app.uid() AND (
    (practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id)));
CREATE POLICY media_delete ON media FOR DELETE TO fp_app USING (
  app.is_practice_admin(practice_id) OR (uploaded_by = app.uid() AND app.is_member(practice_id)));

-- exercises
CREATE POLICY ex_read ON exercises FOR SELECT TO fp_app USING (
  (practice_id IS NULL AND app.uid() IS NOT NULL)
  OR app.is_member(practice_id)
  OR practice_id IN (SELECT app.my_patient_practice_ids()));
CREATE POLICY ex_insert ON exercises FOR INSERT TO fp_app WITH CHECK (
  created_by = app.uid() AND (
    (practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id)));
CREATE POLICY ex_update ON exercises FOR UPDATE TO fp_app
  USING ((practice_id IS NULL AND app.is_platform_admin())
         OR app.is_practice_admin(practice_id)
         OR (app.is_member(practice_id) AND created_by = app.uid()))
  WITH CHECK ((practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id));

CREATE POLICY exnotes_read ON exercise_clinical_notes FOR SELECT TO fp_app USING (
  (practice_id IS NULL AND app.is_professional()) OR app.is_member(practice_id));
CREATE POLICY exnotes_write ON exercise_clinical_notes FOR INSERT TO fp_app WITH CHECK (
  practice_id IS NOT DISTINCT FROM (SELECT e.practice_id FROM exercises e WHERE e.id = exercise_id)
  AND ((practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id)));
CREATE POLICY exnotes_update ON exercise_clinical_notes FOR UPDATE TO fp_app
  USING ((practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id))
  WITH CHECK ((practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id));

CREATE POLICY exrel_read ON exercise_relations FOR SELECT TO fp_app USING (
  (practice_id IS NULL AND app.uid() IS NOT NULL) OR app.is_member(practice_id)
  OR practice_id IN (SELECT app.my_patient_practice_ids()));
CREATE POLICY exrel_write ON exercise_relations FOR INSERT TO fp_app WITH CHECK (
  (practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id));
CREATE POLICY exrel_delete ON exercise_relations FOR DELETE TO fp_app USING (
  (practice_id IS NULL AND app.is_platform_admin()) OR app.is_member(practice_id));

CREATE POLICY exfav_all ON exercise_favorites TO fp_app
  USING (user_id = app.uid()) WITH CHECK (user_id = app.uid());

-- programs & templates
CREATE POLICY prog_read ON programs FOR SELECT TO fp_app USING (
  (is_template AND practice_id IS NULL AND app.is_professional())
  OR (is_template AND app.is_member(practice_id))
  OR (NOT is_template AND app.can_manage_patient(patient_id))
  OR (NOT is_template AND status IN ('active','completed') AND patient_id IN (SELECT app.my_patient_ids())));
CREATE POLICY prog_insert ON programs FOR INSERT TO fp_app WITH CHECK (
  created_by = app.uid() AND (
    (is_template AND practice_id IS NULL AND app.is_platform_admin())
    OR (is_template AND app.is_member(practice_id))
    OR (NOT is_template AND app.can_manage_patient(patient_id) AND practice_id = app.patient_practice(patient_id))));
CREATE POLICY prog_update ON programs FOR UPDATE TO fp_app
  USING ((is_template AND practice_id IS NULL AND app.is_platform_admin())
         OR (is_template AND app.is_member(practice_id))
         OR (NOT is_template AND app.can_manage_patient(patient_id)))
  WITH CHECK ((is_template AND practice_id IS NULL AND app.is_platform_admin())
         OR (is_template AND app.is_member(practice_id))
         OR (NOT is_template AND app.can_manage_patient(patient_id) AND practice_id = app.patient_practice(patient_id)));
CREATE POLICY prog_delete ON programs FOR DELETE TO fp_app USING (
  (is_template AND (app.is_practice_admin(practice_id) OR (app.is_member(practice_id) AND created_by = app.uid())))
  OR (NOT is_template AND status = 'draft' AND app.can_manage_patient(patient_id)));

CREATE POLICY items_read ON program_items FOR SELECT TO fp_app USING (app.can_view_program(program_id));
CREATE POLICY items_insert ON program_items FOR INSERT TO fp_app WITH CHECK (
  app.can_edit_program(program_id) AND practice_id IS NOT DISTINCT FROM app.program_practice(program_id));
CREATE POLICY items_update ON program_items FOR UPDATE TO fp_app
  USING (app.can_edit_program(program_id))
  WITH CHECK (app.can_edit_program(program_id) AND practice_id IS NOT DISTINCT FROM app.program_practice(program_id));
CREATE POLICY items_delete ON program_items FOR DELETE TO fp_app USING (app.can_edit_program(program_id));

CREATE POLICY versions_read ON program_versions FOR SELECT TO fp_app USING (app.can_edit_program(program_id));
CREATE POLICY versions_insert ON program_versions FOR INSERT TO fp_app WITH CHECK (
  app.can_edit_program(program_id) AND created_by = app.uid());

CREATE POLICY tfav_all ON template_favorites TO fp_app
  USING (user_id = app.uid()) WITH CHECK (user_id = app.uid());

-- patient activity
CREATE POLICY ws_read ON workout_sessions FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY ws_insert ON workout_sessions FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids())
  AND practice_id = app.patient_practice(patient_id)
  AND app.can_view_program(program_id)
  AND EXISTS (SELECT 1 FROM programs p WHERE p.id = program_id AND p.patient_id = workout_sessions.patient_id
              AND p.status = 'active'));
CREATE POLICY ws_update ON workout_sessions FOR UPDATE TO fp_app
  USING (app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));

CREATE POLICY logs_read ON exercise_logs FOR SELECT TO fp_app USING (
  app.can_manage_patient(patient_id) OR patient_id IN (SELECT app.my_patient_ids()));
CREATE POLICY logs_insert ON exercise_logs FOR INSERT TO fp_app WITH CHECK (
  patient_id IN (SELECT app.my_patient_ids())
  AND app.session_patient(session_id) = patient_id
  AND practice_id = app.patient_practice(patient_id));
CREATE POLICY logs_update ON exercise_logs FOR UPDATE TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()))
  WITH CHECK (patient_id IN (SELECT app.my_patient_ids()) AND app.session_patient(session_id) = patient_id);

-- notifications
CREATE POLICY notif_read ON notifications FOR SELECT TO fp_app USING (user_id = app.uid());
CREATE POLICY notif_update ON notifications FOR UPDATE TO fp_app USING (user_id = app.uid()) WITH CHECK (user_id = app.uid());
CREATE POLICY notif_insert ON notifications FOR INSERT TO fp_app WITH CHECK (
  app.uid() IS NOT NULL AND app.can_see_user(user_id)
  AND (practice_id IS NULL OR app.is_member(practice_id) OR practice_id IN (SELECT app.my_patient_practice_ids())));

-- audit log: append-only; practice admins can read their own practice's entries
CREATE POLICY audit_insert ON audit_log FOR INSERT TO fp_app WITH CHECK (actor_id IS NOT DISTINCT FROM app.uid());
CREATE POLICY audit_read ON audit_log FOR SELECT TO fp_app USING (app.is_practice_admin(practice_id));

-- public contact form (anonymous insert only, nobody reads through the app role)
CREATE POLICY contact_insert ON contact_requests FOR INSERT TO fp_app WITH CHECK (true);
