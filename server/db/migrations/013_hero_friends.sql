-- Hero friends (opt-in, off by default). A patient who switches sharing on gets a friend code;
-- two patients become friends only when one sends a request with the other's code and the other
-- accepts. Friends see ONLY each other's hero card: hero name, look, gear, level, total level and
-- the nine skill levels. Never pain, programmes, sessions, practice or therapist.
--
-- The card is a snapshot the patient's own request writes (shared_stats); a friend never runs a
-- query over another patient's health data. The friendships table has no grants at all for the
-- application role: everything goes through the SECURITY DEFINER functions below, which always
-- act for the logged-in patient (app.my_patient_ids()). Professionals have no access.

ALTER TABLE patient_heroes
  ADD COLUMN share_with_friends boolean NOT NULL DEFAULT false,
  ADD COLUMN friend_code text UNIQUE CHECK (friend_code ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  ADD COLUMN shared_stats jsonb,
  ADD COLUMN stats_updated_at timestamptz;
GRANT UPDATE (share_with_friends, friend_code, shared_stats, stats_updated_at) ON patient_heroes TO fp_app;

CREATE TABLE hero_friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX hero_friendships_pair ON hero_friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE INDEX ON hero_friendships (addressee_id);
ALTER TABLE hero_friendships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hero_friendships FROM PUBLIC;

-- True when p_me is one of the logged-in user's own (active) patient records.
CREATE FUNCTION app.is_me(p_me uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM patients WHERE id = p_me AND user_id = app.uid() AND archived_at IS NULL)
$$;
REVOKE EXECUTE ON FUNCTION app.is_me(uuid) FROM PUBLIC;

-- Send a friend request with a code. Returns: requested | accepted (the other had already asked) |
-- exists | not_found | self | sharing_off | limit.
CREATE FUNCTION app.hero_friend_request(p_me uuid, p_code text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_other uuid;
  v_row hero_friendships%ROWTYPE;
BEGIN
  IF NOT app.is_me(p_me) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM patient_heroes WHERE patient_id = p_me AND share_with_friends) THEN RETURN 'sharing_off'; END IF;
  SELECT h.patient_id INTO v_other FROM patient_heroes h JOIN patients p ON p.id = h.patient_id AND p.archived_at IS NULL
   WHERE h.friend_code = upper(btrim(p_code)) AND h.share_with_friends;
  IF v_other IS NULL THEN RETURN 'not_found'; END IF;
  IF v_other = p_me THEN RETURN 'self'; END IF;
  SELECT * INTO v_row FROM hero_friendships
   WHERE least(requester_id, addressee_id) = least(p_me, v_other) AND greatest(requester_id, addressee_id) = greatest(p_me, v_other);
  IF FOUND THEN
    IF v_row.status = 'pending' AND v_row.addressee_id = p_me THEN
      UPDATE hero_friendships SET status = 'accepted', accepted_at = now() WHERE id = v_row.id;
      RETURN 'accepted';
    END IF;
    RETURN 'exists';
  END IF;
  IF (SELECT count(*) FROM hero_friendships WHERE requester_id = p_me OR addressee_id = p_me) >= 100 THEN RETURN 'limit'; END IF;
  INSERT INTO hero_friendships(requester_id, addressee_id) VALUES (p_me, v_other);
  RETURN 'requested';
END $$;
REVOKE EXECUTE ON FUNCTION app.hero_friend_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_friend_request(uuid, text) TO fp_app;

-- Accept (only the addressee of a pending request) or remove/decline (either side). Returns true when done.
CREATE FUNCTION app.hero_friend_respond(p_me uuid, p_id uuid, p_accept boolean) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT app.is_me(p_me) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_accept THEN
    UPDATE hero_friendships SET status = 'accepted', accepted_at = now()
     WHERE id = p_id AND addressee_id = p_me AND status = 'pending'
       AND EXISTS (SELECT 1 FROM patient_heroes WHERE patient_id = p_me AND share_with_friends);
  ELSE
    DELETE FROM hero_friendships WHERE id = p_id AND (requester_id = p_me OR addressee_id = p_me);
  END IF;
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION app.hero_friend_respond(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_friend_respond(uuid, uuid, boolean) TO fp_app;

-- Switching sharing off ends every friendship and request, so nothing stays visible.
CREATE FUNCTION app.hero_friends_clear(p_me uuid) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT app.is_me(p_me) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM hero_friendships WHERE requester_id = p_me OR addressee_id = p_me;
END $$;
REVOKE EXECUTE ON FUNCTION app.hero_friends_clear(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_friends_clear(uuid) TO fp_app;

-- The friends list of the logged-in patient. Pending requests show only the hero name and look;
-- stats only for accepted friends who still share. Patients who stopped sharing or were archived
-- do not appear.
CREATE FUNCTION app.hero_friends(p_me uuid)
RETURNS TABLE (id uuid, kind text, hero_name text, look jsonb, stats jsonb, stats_updated_at timestamptz, since timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT f.id,
         CASE WHEN f.status = 'accepted' THEN 'friend' WHEN f.addressee_id = p_me THEN 'incoming' ELSE 'outgoing' END,
         h.hero_name,
         jsonb_build_object('frame', h.frame, 'build', h.build, 'skin', h.skin, 'hair', h.hair, 'hairColor', h.hair_color,
           'eyeColor', h.eye_color, 'beard', h.beard, 'glasses', h.glasses, 'outfit', h.outfit, 'sport', h.sport, 'gear', to_jsonb(h.gear)),
         CASE WHEN f.status = 'accepted' THEN h.shared_stats END,
         CASE WHEN f.status = 'accepted' THEN h.stats_updated_at END,
         coalesce(f.accepted_at, f.created_at)
    FROM hero_friendships f
    JOIN patient_heroes h ON h.patient_id = CASE WHEN f.requester_id = p_me THEN f.addressee_id ELSE f.requester_id END
    JOIN patients p ON p.id = h.patient_id AND p.archived_at IS NULL
   WHERE app.is_me(p_me) AND (f.requester_id = p_me OR f.addressee_id = p_me) AND h.share_with_friends
     AND EXISTS (SELECT 1 FROM patient_heroes me WHERE me.patient_id = p_me AND me.share_with_friends)
   ORDER BY 2, h.hero_name
$$;
REVOKE EXECUTE ON FUNCTION app.hero_friends(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_friends(uuid) TO fp_app;
