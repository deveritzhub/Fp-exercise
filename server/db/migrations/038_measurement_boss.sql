-- Measurement boss and the cosmetic heirloom.
-- A boss goal is one measurable target on one patient programme. Defeating it records the moment
-- and notifies the therapist. It never changes phase_no.
-- A self-test counts only after a therapist confirms that row.
-- The heirloom tier is stored as a best-so-far ratio and is not allowed to fall.

CREATE TABLE phase_boss_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  source       text NOT NULL CHECK (source IN ('outcome', 'mobility')),
  domain       text CHECK (domain IS NULL OR domain IN ('rom', 'strength', 'function', 'confidence')),
  metric       text CHECK (metric IS NULL OR length(metric) BETWEEN 1 AND 80),
  unit         text NOT NULL CHECK (unit IN ('degrees', 'kg', 'N', 'score_0_10', 'percent', 'cm')),
  side         text NOT NULL DEFAULT 'not_applicable' CHECK (side IN ('left', 'right', 'bilateral', 'not_applicable', 'none')),
  test_key     text CHECK (test_key IS NULL OR test_key ~ '^[a-z_]{2,32}$'),
  comparator   text NOT NULL CHECK (comparator IN ('gte', 'lte')),
  target       numeric(9,2) NOT NULL,
  label_nl     text NOT NULL CHECK (length(label_nl) BETWEEN 1 AND 80),
  label_en     text NOT NULL CHECK (length(label_en) BETWEEN 1 AND 80),
  defeated_at  timestamptz,
  notified_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id),
  CHECK (
    (source = 'outcome' AND domain IS NOT NULL AND metric IS NOT NULL AND test_key IS NULL)
    OR (source = 'mobility' AND test_key IS NOT NULL AND domain IS NULL AND metric IS NULL AND unit = 'cm')
  )
);

CREATE INDEX phase_boss_goals_patient_idx ON phase_boss_goals(patient_id);

ALTER TABLE phase_boss_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON phase_boss_goals FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON phase_boss_goals TO fp_app;

CREATE POLICY boss_staff_write ON phase_boss_goals FOR ALL TO fp_app
  USING (app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id = app.patient_practice(patient_id))
  WITH CHECK (app.can_manage_patient(patient_id) AND app.is_professional() AND practice_id = app.patient_practice(patient_id));

CREATE POLICY boss_patient_read ON phase_boss_goals FOR SELECT TO fp_app
  USING (patient_id IN (SELECT app.my_patient_ids()) AND practice_id = app.patient_practice(patient_id));

-- Coach and personal accounts cannot store a clinical outcome boss.
CREATE FUNCTION app.boss_goal_kind_ok() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.source = 'outcome' AND EXISTS (
    SELECT 1 FROM practices WHERE id = NEW.practice_id AND kind <> 'physio'
  ) THEN
    RAISE EXCEPTION 'clinical_boss_goal' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER boss_goal_kind BEFORE INSERT OR UPDATE OF source, practice_id ON phase_boss_goals
  FOR EACH ROW EXECUTE FUNCTION app.boss_goal_kind_ok();

CREATE TABLE mobility_confirmations (
  test_id      uuid PRIMARY KEY REFERENCES mobility_tests(id) ON DELETE CASCADE,
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  confirmed_by uuid NOT NULL REFERENCES users(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobility_confirmations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mobility_confirmations FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON mobility_confirmations TO fp_app;

CREATE POLICY confirm_staff_read ON mobility_confirmations FOR SELECT TO fp_app
  USING (EXISTS (
    SELECT 1 FROM mobility_tests t
     WHERE t.id = test_id AND app.can_manage_patient(t.patient_id) AND app.staff_sees_module(t.patient_id, 'mobiliteit')
  ));

CREATE POLICY confirm_staff_insert ON mobility_confirmations FOR INSERT TO fp_app
  WITH CHECK (
    confirmed_by = app.uid()
    AND EXISTS (
      SELECT 1 FROM mobility_tests t
       WHERE t.id = test_id AND t.practice_id = practice_id
         AND app.can_manage_patient(t.patient_id) AND app.staff_sees_module(t.patient_id, 'mobiliteit')
    )
  );

CREATE POLICY confirm_patient_read ON mobility_confirmations FOR SELECT TO fp_app
  USING (EXISTS (
    SELECT 1 FROM mobility_tests t
     WHERE t.id = test_id AND t.patient_id IN (SELECT app.my_patient_ids())
  ));

-- Editing the centimetres drops the confirmation, so a changed self-test is not still "confirmed".
CREATE FUNCTION app.clear_mobility_confirmation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.cm IS DISTINCT FROM OLD.cm THEN
    DELETE FROM mobility_confirmations WHERE test_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER mobility_cm_clears_confirmation BEFORE UPDATE OF cm ON mobility_tests
  FOR EACH ROW EXECUTE FUNCTION app.clear_mobility_confirmation();

ALTER TABLE patient_heroes
  ADD COLUMN heirloom text CHECK (heirloom IS NULL OR heirloom IN ('weapon', 'shield', 'amulet')),
  ADD COLUMN heirloom_best numeric(4,3) NOT NULL DEFAULT 0 CHECK (heirloom_best BETWEEN 0 AND 1);

GRANT UPDATE (heirloom, heirloom_best) ON patient_heroes TO fp_app;

CREATE FUNCTION app.heirloom_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.heirloom IS NOT NULL AND NEW.heirloom IS DISTINCT FROM OLD.heirloom THEN
    RAISE EXCEPTION 'heirloom_locked' USING ERRCODE = '23514';
  END IF;
  IF NEW.heirloom_best < OLD.heirloom_best THEN
    NEW.heirloom_best := OLD.heirloom_best;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER heirloom_guard BEFORE UPDATE OF heirloom, heirloom_best ON patient_heroes
  FOR EACH ROW EXECUTE FUNCTION app.heirloom_guard();
