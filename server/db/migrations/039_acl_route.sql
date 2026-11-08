-- ACL measurement route. Widens clinician outcomes (grade, seconds, centimetres, a stable key)
-- and lets one phase boss have several criteria, including a limb symmetry index computed in the app.
-- Nothing here releases a phase.

ALTER TABLE programs ADD COLUMN map_region text CHECK (map_region IS NULL OR map_region ~ '^[a-z_]{2,40}$');

ALTER TABLE patient_outcomes ADD COLUMN metric_key text CHECK (metric_key IS NULL OR metric_key ~ '^[a-z0-9_]{2,40}$');
ALTER TABLE patient_outcomes DROP CONSTRAINT outcomes_domain_unit;
ALTER TABLE patient_outcomes ADD CONSTRAINT outcomes_domain_unit CHECK (
  (domain = 'rom' AND unit = 'degrees' AND value <= 360) OR
  (domain = 'strength' AND unit IN ('kg', 'N')) OR
  (domain = 'function' AND (
    (unit = 'score_0_10' AND value <= 10) OR
    (unit = 'percent' AND value <= 100) OR
    (unit = 'grade' AND value <= 4) OR
    (unit = 'seconds' AND value <= 600) OR
    (unit = 'cm' AND value <= 2000)
  )) OR
  (domain = 'confidence' AND (
    (unit = 'score_0_10' AND value <= 10) OR (unit = 'percent' AND value <= 100)
  ))
);

ALTER TABLE phase_boss_goals DROP CONSTRAINT phase_boss_goals_program_id_key;
ALTER TABLE phase_boss_goals
  ADD COLUMN slot smallint NOT NULL DEFAULT 1 CHECK (slot BETWEEN 1 AND 12),
  ADD COLUMN measure_key text CHECK (measure_key IS NULL OR measure_key ~ '^[a-z0-9_]{2,40}$'),
  ADD COLUMN boss_nl text NOT NULL DEFAULT '' CHECK (length(boss_nl) <= 80),
  ADD COLUMN boss_en text NOT NULL DEFAULT '' CHECK (length(boss_en) <= 80),
  ADD COLUMN clinical_nl text NOT NULL DEFAULT '' CHECK (length(clinical_nl) <= 600),
  ADD COLUMN clinical_en text NOT NULL DEFAULT '' CHECK (length(clinical_en) <= 600),
  ADD COLUMN involved_side text CHECK (involved_side IS NULL OR involved_side IN ('left', 'right')),
  ADD COLUMN mode text NOT NULL DEFAULT 'value' CHECK (mode IN ('value', 'lsi', 'recorded'));
CREATE UNIQUE INDEX phase_boss_goals_slot_idx ON phase_boss_goals(program_id, slot);

-- Drop the checks from migration 038. Postgres may print them as ANY(ARRAY[...]) rather than IN (...).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
     WHERE conrelid = 'phase_boss_goals'::regclass AND contype = 'c'
  LOOP
    IF r.def ILIKE '%source%' OR r.def ILIKE '%unit%' OR r.def ILIKE '%comparator%' OR r.def ILIKE '%test_key%' THEN
      EXECUTE format('ALTER TABLE phase_boss_goals DROP CONSTRAINT %I', r.conname);
    END IF;
  END LOOP;
END $$;

ALTER TABLE phase_boss_goals ADD CONSTRAINT phase_boss_goals_source_check CHECK (source IN ('outcome', 'mobility', 'lsi'));
ALTER TABLE phase_boss_goals ADD CONSTRAINT phase_boss_goals_unit_check CHECK (unit IN ('degrees', 'kg', 'N', 'score_0_10', 'percent', 'cm', 'grade', 'seconds'));
ALTER TABLE phase_boss_goals ADD CONSTRAINT phase_boss_goals_comparator_check CHECK (comparator IN ('gte', 'lte', 'recorded'));
ALTER TABLE phase_boss_goals ADD CONSTRAINT phase_boss_goals_shape_check CHECK (
  (source = 'outcome' AND mode = 'value' AND domain IS NOT NULL AND metric IS NOT NULL AND test_key IS NULL)
  OR (source = 'mobility' AND mode = 'value' AND test_key IS NOT NULL AND domain IS NULL AND metric IS NULL AND unit = 'cm')
  OR (source = 'lsi' AND mode IN ('lsi', 'recorded') AND domain IS NULL AND metric IS NULL AND test_key IS NULL AND unit = 'percent' AND measure_key IS NOT NULL AND involved_side IS NOT NULL)
);

CREATE OR REPLACE FUNCTION app.boss_goal_kind_ok() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.source IN ('outcome', 'lsi') AND EXISTS (
    SELECT 1 FROM practices WHERE id = NEW.practice_id AND kind <> 'physio'
  ) THEN
    RAISE EXCEPTION 'clinical_boss_goal' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
