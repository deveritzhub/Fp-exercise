-- Account types: physiotherapy practice (default, unchanged), personal trainer / studio, and
-- personal accounts (someone training for themselves). See shared/accountKind.ts.

ALTER TABLE practices ADD COLUMN kind text NOT NULL DEFAULT 'physio' CHECK (kind IN ('physio', 'coach', 'personal'));

-- Plans for the new kinds (prices are set later; not public until billing exists).
INSERT INTO plans(code, name, limits, public, sort_order) VALUES
  ('coach_trial', 'Coach proefperiode', '{"days": 30, "therapists": 1, "active_patients": 25}', false, 10),
  ('personal', 'Persoonlijk', '{"therapists": 0, "active_patients": 1}', false, 11)
ON CONFLICT (code) DO NOTHING;

-- Self-check (PAR-Q style) for patients without a physiotherapist: only the outcome is stored,
-- never the answers. 'clear' = all no; 'doctor_ok' = a "yes", but a doctor said training is fine.
ALTER TABLE patients
  ADD COLUMN self_check_at timestamptz,
  ADD COLUMN self_check_outcome text CHECK (self_check_outcome IN ('clear', 'doctor_ok'));

CREATE FUNCTION app.practice_kind(p_practice uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT kind FROM practices WHERE id = p_practice
$$;
REVOKE EXECUTE ON FUNCTION app.practice_kind(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.practice_kind(uuid) TO fp_app, fp_auth;

/**
 * Self-signup for a coach or a personal account. Runs as the new (just created) user, who must not
 * belong anywhere yet. Creates the account ("practice") and makes the user its owner. For a personal
 * account the user is also the one training (a patient record), and the owner role is removed again
 * by app.finish_personal_signup() once the library has been copied in (same transaction).
 */
CREATE FUNCTION app.self_signup(p_kind text, p_name text, p_slug text, p_first text, p_last text) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user users%ROWTYPE;
  v_practice uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_user FROM users WHERE id = app.uid() AND disabled_at IS NULL;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_kind NOT IN ('coach', 'personal') THEN RAISE EXCEPTION 'invalid kind' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM practice_members WHERE user_id = v_user.id) OR EXISTS (SELECT 1 FROM patients WHERE user_id = v_user.id) THEN
    RAISE EXCEPTION 'already set up' USING ERRCODE = '42501', HINT = 'account_exists';
  END IF;
  INSERT INTO practices(id, name, slug, kind, plan_code, trial_ends_at, settings)
  VALUES (v_practice, p_name, p_slug, p_kind, CASE WHEN p_kind = 'coach' THEN 'coach_trial' ELSE 'personal' END,
          CASE WHEN p_kind = 'coach' THEN now() + interval '30 days' END,
          -- Coaches see their clients' data: two-step verification, like physiotherapy practices.
          CASE WHEN p_kind = 'coach' THEN '{"requireMfa": true}'::jsonb ELSE '{}'::jsonb END);
  INSERT INTO practice_members(practice_id, user_id, role, title) VALUES (v_practice, v_user.id, 'owner', CASE WHEN p_kind = 'coach' THEN 'Coach' END);
  IF p_kind = 'personal' THEN
    INSERT INTO patients(practice_id, user_id, first_name, last_name, email, locale, active_mode, created_by)
    VALUES (v_practice, v_user.id, p_first, p_last, v_user.email, v_user.locale, 'kracht', v_user.id);
  END IF;
  RETURN v_practice;
END $$;
REVOKE EXECUTE ON FUNCTION app.self_signup(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.self_signup(text, text, text, text, text) TO fp_app;

-- A personal account trains, it does not manage: drop the temporary owner role.
CREATE FUNCTION app.finish_personal_signup(p_practice uuid) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM practice_members m USING practices p
   WHERE m.practice_id = p_practice AND m.user_id = app.uid() AND p.id = m.practice_id AND p.kind = 'personal';
END $$;
REVOKE EXECUTE ON FUNCTION app.finish_personal_signup(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.finish_personal_signup(uuid) TO fp_app;

/**
 * Self-check for patients of a personal account. Unlocks the strength module (which otherwise needs
 * the therapist's transition clearance) when all answers are "no", or when a doctor said yes.
 * Returns the outcome; 'see_doctor' stores nothing.
 */
CREATE FUNCTION app.patient_self_check(p_any_yes boolean, p_doctor_ok boolean) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pt patients%ROWTYPE;
  v_outcome text;
BEGIN
  SELECT * INTO pt FROM patients WHERE user_id = app.uid() AND archived_at IS NULL;
  IF pt.id IS NULL OR app.practice_kind(pt.practice_id) <> 'personal' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  v_outcome := CASE WHEN NOT p_any_yes THEN 'clear' WHEN p_doctor_ok THEN 'doctor_ok' ELSE 'see_doctor' END;
  IF v_outcome <> 'see_doctor' THEN
    UPDATE patients SET self_check_at = now(), self_check_outcome = v_outcome, strength_cleared_at = coalesce(strength_cleared_at, now())
     WHERE id = pt.id;
  END IF;
  RETURN v_outcome;
END $$;
REVOKE EXECUTE ON FUNCTION app.patient_self_check(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.patient_self_check(boolean, boolean) TO fp_app;

-- Rehab programmes need a physiotherapist: patients of other kinds never get one, also not by mistake.
-- A plain new programme of a coach (the column default is 'revalidatie') becomes krachttraining;
-- a rehab phase programme is refused.
CREATE FUNCTION app.no_rehab_outside_physio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.module = 'revalidatie' AND NOT NEW.is_template AND app.practice_kind(NEW.practice_id) <> 'physio' THEN
    IF TG_OP = 'INSERT' AND NEW.series_key IS NULL AND NEW.phase_no IS NULL THEN
      NEW.module := 'kracht';
    ELSE
      RAISE EXCEPTION 'rehab programmes need a physiotherapy practice' USING ERRCODE = '42501', HINT = 'rehab_needs_physio';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER programs_no_rehab_outside_physio BEFORE INSERT OR UPDATE OF module, status ON programs
  FOR EACH ROW EXECUTE FUNCTION app.no_rehab_outside_physio();
