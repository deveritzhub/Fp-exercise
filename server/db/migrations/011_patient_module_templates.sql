-- Patients may start kracht/mobiliteit programmes themselves (W02), but RLS does not let them read
-- templates. This read-only function returns just the start templates of the patient's own practice
-- (first phase or no phase). Non-destructive: no tables or policies change.
CREATE FUNCTION app.patient_module_templates()
RETURNS TABLE (id uuid, title text, patient_instructions text, module text, series_title text, phase_no int,
               phase_count int, phase_name text, phase_weeks text, phase_goal text, red_flags jsonb, item_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.id, p.title, p.patient_instructions, p.module, p.series_title, p.phase_no, p.phase_count, p.phase_name,
         p.phase_weeks, p.phase_goal, p.red_flags,
         (SELECT count(*) FROM program_items i WHERE i.program_id = p.id)::int
    FROM programs p
    JOIN patients pt ON pt.user_id = app.uid() AND pt.archived_at IS NULL
   WHERE p.is_template AND p.status <> 'archived' AND p.module IN ('kracht', 'mobiliteit')
     AND p.practice_id = pt.practice_id AND (p.series_key IS NULL OR p.phase_no = 1)
   ORDER BY p.module, p.title
$$;
REVOKE EXECUTE ON FUNCTION app.patient_module_templates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.patient_module_templates() TO fp_app;
