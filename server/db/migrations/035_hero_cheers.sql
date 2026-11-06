-- Cheers between hero friends: a pre-chosen encouragement ("Zet 'm op!"), no free text, so nothing
-- to moderate and no health data. Only between accepted friends who both still share; at most one
-- cheer per friend per day. Like the friendships, the table has no grants for the application role:
-- everything goes through SECURITY DEFINER functions that act for the logged-in patient. Ending a
-- friendship (or switching sharing off) removes its cheers.

CREATE TABLE hero_cheers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid NOT NULL REFERENCES hero_friendships(id) ON DELETE CASCADE,
  from_id       uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  to_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  cheer         text NOT NULL CHECK (cheer IN ('go', 'strong', 'proud', 'keep')),
  day           date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Amsterdam')::date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (friendship_id, from_id, day)
);
CREATE INDEX ON hero_cheers (to_id, created_at DESC);
ALTER TABLE hero_cheers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_cheers FROM PUBLIC;

-- Send a cheer to a friend. Returns: sent | limit (already today) | not_friends.
CREATE FUNCTION app.hero_cheer_send(p_me uuid, p_friendship uuid, p_cheer text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_other uuid;
BEGIN
  IF NOT app.is_me(p_me) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT CASE WHEN f.requester_id = p_me THEN f.addressee_id ELSE f.requester_id END INTO v_other
    FROM hero_friendships f
   WHERE f.id = p_friendship AND f.status = 'accepted' AND (f.requester_id = p_me OR f.addressee_id = p_me);
  IF v_other IS NULL
     OR NOT EXISTS (SELECT 1 FROM patient_heroes WHERE patient_id = p_me AND share_with_friends)
     OR NOT EXISTS (SELECT 1 FROM patient_heroes h JOIN patients p ON p.id = h.patient_id AND p.archived_at IS NULL
                     WHERE h.patient_id = v_other AND h.share_with_friends) THEN
    RETURN 'not_friends';
  END IF;
  INSERT INTO hero_cheers(friendship_id, from_id, to_id, cheer) VALUES (p_friendship, p_me, v_other, p_cheer)
    ON CONFLICT (friendship_id, from_id, day) DO NOTHING;
  RETURN CASE WHEN FOUND THEN 'sent' ELSE 'limit' END;
END $$;
REVOKE EXECUTE ON FUNCTION app.hero_cheer_send(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_cheer_send(uuid, uuid, text) TO fp_app;

-- Cheers the logged-in patient received in the last 14 days, from friends who still share.
-- Also which friends the patient already cheered today (to grey out the button).
CREATE FUNCTION app.hero_cheers(p_me uuid)
RETURNS TABLE (friendship_id uuid, direction text, hero_name text, cheer text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.friendship_id, 'in', h.hero_name, c.cheer, c.created_at
    FROM hero_cheers c JOIN patient_heroes h ON h.patient_id = c.from_id AND h.share_with_friends
   WHERE app.is_me(p_me) AND c.to_id = p_me AND c.created_at > now() - interval '14 days'
  UNION ALL
  SELECT c.friendship_id, 'out', NULL, c.cheer, c.created_at
    FROM hero_cheers c
   WHERE app.is_me(p_me) AND c.from_id = p_me AND c.day = (now() AT TIME ZONE 'Europe/Amsterdam')::date
  ORDER BY 5 DESC
  LIMIT 50
$$;
REVOKE EXECUTE ON FUNCTION app.hero_cheers(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_cheers(uuid) TO fp_app;
