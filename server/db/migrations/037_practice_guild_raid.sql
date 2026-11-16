-- Practice guild raid. Every active patient of a practice is in the guild.
-- The function returns three integers for the caller’s own practice only:
--   cohort   = active patients
--   workouts = prescribed workouts completed this week (not extra self-logged training)
--   mine     = the caller’s own completed workouts, or 0 for staff
-- No names and no per-person rows. The API hides the totals below five patients
-- (shared/worldMap.ts, same cohort as the team quest).

CREATE FUNCTION app.practice_guild_week(p_practice uuid, p_week date)
RETURNS TABLE (cohort int, workouts int, mine int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH allowed AS (
    SELECT
      (
        EXISTS (
          SELECT 1 FROM patients pt
           WHERE pt.user_id = app.uid() AND pt.archived_at IS NULL AND pt.practice_id = p_practice
        )
        OR app.is_member(p_practice)
      ) AS ok,
      (
        SELECT pt.id FROM patients pt
         WHERE pt.user_id = app.uid() AND pt.archived_at IS NULL AND pt.practice_id = p_practice
         LIMIT 1
      ) AS me
  ),
  members AS (
    SELECT pt.id
      FROM patients pt
      CROSS JOIN allowed a
     WHERE a.ok AND pt.practice_id = p_practice AND pt.archived_at IS NULL
  )
  SELECT
    (SELECT count(*)::int FROM members),
    (SELECT count(*)::int
       FROM workout_sessions s
       JOIN members m ON m.id = s.patient_id
      WHERE s.completed_at IS NOT NULL
        AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date >= p_week
        AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date < p_week + 7),
    (SELECT count(*)::int
       FROM workout_sessions s
       CROSS JOIN allowed a
      WHERE a.me IS NOT NULL
        AND s.patient_id = a.me
        AND s.completed_at IS NOT NULL
        AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date >= p_week
        AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date < p_week + 7)
$$;

REVOKE EXECUTE ON FUNCTION app.practice_guild_week(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.practice_guild_week(uuid, date) TO fp_app;
