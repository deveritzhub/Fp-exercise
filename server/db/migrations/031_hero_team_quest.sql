-- Team quest with companions (opt-in, separate from friend sharing, off by default).
-- Each patient writes only their OWN snapshot for the week: did they do their own weekly goal
-- (a rest week or an open medical stop also counts, so nobody is penalised). Friends never read
-- each other's data: app.hero_team_week returns only group counts, and the server turns those
-- into a status that is shown only from five participants (see shared/teamQuest.ts).
ALTER TABLE patient_heroes
  ADD COLUMN team_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN team_week date,
  ADD COLUMN team_done boolean;
GRANT UPDATE (team_opt_in, team_week, team_done) ON patient_heroes TO fp_app;

CREATE FUNCTION app.hero_team_week(p_me uuid, p_week date)
RETURNS TABLE (participants int, contributed int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH me AS (
    SELECT h.patient_id FROM patient_heroes h
     WHERE app.is_me(p_me) AND h.patient_id = p_me AND h.share_with_friends AND h.team_opt_in
  ), members AS (
    SELECT patient_id FROM me
    UNION
    SELECT h.patient_id
      FROM me
      JOIN hero_friendships f ON f.status = 'accepted' AND (f.requester_id = me.patient_id OR f.addressee_id = me.patient_id)
      JOIN patient_heroes h ON h.patient_id = CASE WHEN f.requester_id = me.patient_id THEN f.addressee_id ELSE f.requester_id END
      JOIN patients p ON p.id = h.patient_id AND p.archived_at IS NULL
     WHERE h.share_with_friends AND h.team_opt_in
  )
  SELECT count(*)::int,
         count(*) FILTER (WHERE h.team_week = p_week AND h.team_done)::int
    FROM members m JOIN patient_heroes h ON h.patient_id = m.patient_id
$$;
REVOKE EXECUTE ON FUNCTION app.hero_team_week(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_team_week(uuid, date) TO fp_app;
