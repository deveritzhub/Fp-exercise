-- Playing together in the village: the server needs, for the logged-in patient, the friends they may
-- see live (accepted friendships where both still share). The other patient's id stays on the
-- server; a client only ever sees the friendship id, which both friends already know.
CREATE FUNCTION app.hero_live_friends(p_me uuid)
RETURNS TABLE (friendship_id uuid, friend_id uuid, hero_name text, look jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT f.id,
         h.patient_id,
         h.hero_name,
         jsonb_build_object('frame', h.frame, 'build', h.build, 'skin', h.skin, 'hair', h.hair, 'hairColor', h.hair_color,
           'eyeColor', h.eye_color, 'beard', h.beard, 'glasses', h.glasses, 'outfit', h.outfit, 'sport', h.sport, 'gear', to_jsonb(h.gear))
    FROM hero_friendships f
    JOIN patient_heroes h ON h.patient_id = CASE WHEN f.requester_id = p_me THEN f.addressee_id ELSE f.requester_id END
    JOIN patients p ON p.id = h.patient_id AND p.archived_at IS NULL
   WHERE app.is_me(p_me) AND f.status = 'accepted' AND (f.requester_id = p_me OR f.addressee_id = p_me) AND h.share_with_friends
     AND EXISTS (SELECT 1 FROM patient_heroes me WHERE me.patient_id = p_me AND me.share_with_friends)
$$;
REVOKE EXECUTE ON FUNCTION app.hero_live_friends(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hero_live_friends(uuid) TO fp_app;
