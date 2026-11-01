-- Skills v2 reads two facts the patient cannot see as checklist text or as a future
-- programme: which later phase trains a skill, and whether a ticked criterion was a
-- jump test or a return-to-sport item. No names, notes or kilogram values leave these functions.

CREATE FUNCTION app.series_phase_exercises(p_series text)
RETURNS TABLE (phase_no int, training_categories text[], movement_category text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.phase_no::int, e.training_categories, e.movement_category
    FROM programs p
    JOIN program_items i ON i.program_id = p.id
    JOIN exercises e ON e.id = i.exercise_id
   WHERE p.is_template AND p.series_key = p_series AND p.phase_no IS NOT NULL
     AND (
       app.is_professional()
       OR EXISTS (
         SELECT 1 FROM programs mine
          WHERE mine.series_key = p_series AND NOT mine.is_template
            AND mine.patient_id IN (SELECT app.my_patient_ids()))
     )
$$;
REVOKE ALL ON FUNCTION app.series_phase_exercises(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.series_phase_exercises(text) TO fp_app;

CREATE FUNCTION app.hero_criterion_events(p_patient uuid)
RETURNS TABLE (day date, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (c.checked_at AT TIME ZONE 'Europe/Amsterdam')::date, k.kind
    FROM program_criteria_checks c
    JOIN programs p ON p.id = c.program_id
    JOIN LATERAL (
      SELECT 'jump'::text AS kind WHERE c.label ~* '(sprong|jump|hop|sprint|spurt)'
      UNION ALL
      SELECT 'return_to_sport' WHERE c.label ~* '(return to sport|return-to-sport|sportspecif|hervatting sport|terugkeer|rts)'
    ) k ON true
   WHERE p.patient_id = p_patient
     AND (p_patient IN (SELECT app.my_patient_ids()) OR app.can_manage_patient(p_patient))
$$;
REVOKE ALL ON FUNCTION app.hero_criterion_events(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_criterion_events(uuid) TO fp_app;
