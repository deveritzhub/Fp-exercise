-- The strength schedule chooser (format, days per week, goal) needs to know which shipped schedule a
-- start template is and on how many weekdays it trains. Same read-only function as 011 with two more
-- columns: source_key (the id from the library file) and days_per_week. Non-destructive: no tables or
-- policies change; the function is dropped and recreated because its result columns change.
DROP FUNCTION app.patient_module_templates();
CREATE FUNCTION app.patient_module_templates()
RETURNS TABLE (id uuid, title text, patient_instructions text, module text, series_title text, phase_no int,
               phase_count int, phase_name text, phase_weeks text, phase_goal text, red_flags jsonb, item_count int,
               source_key text, days_per_week int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.id, p.title, p.patient_instructions, p.module, p.series_title, p.phase_no, p.phase_count, p.phase_name,
         p.phase_weeks, p.phase_goal, p.red_flags,
         (SELECT count(*) FROM program_items i WHERE i.program_id = p.id)::int,
         p.source_key,
         (SELECT count(DISTINCT d) FROM program_items i, unnest(i.days) AS d WHERE i.program_id = p.id)::int
    FROM programs p
    JOIN patients pt ON pt.user_id = app.uid() AND pt.archived_at IS NULL
   WHERE p.is_template AND p.status <> 'archived' AND p.module IN ('kracht', 'mobiliteit')
     AND p.practice_id = pt.practice_id AND (p.series_key IS NULL OR p.phase_no = 1)
   ORDER BY p.module, p.title
$$;
REVOKE EXECUTE ON FUNCTION app.patient_module_templates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.patient_module_templates() TO fp_app;
