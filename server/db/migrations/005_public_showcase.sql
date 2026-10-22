-- Public (anonymous) access to central-library demonstration videos for the marketing website.
-- Only media that is (a) global and (b) the video of a global, non-archived exercise is exposed.
-- Never practice media, never patient data.
CREATE FUNCTION app.public_showcase(p_limit int DEFAULT 6)
RETURNS TABLE (media_id uuid, name_nl text, name_en text, body_region text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT e.video_media_id, e.name_nl, e.name_en, e.body_region
    FROM exercises e JOIN media m ON m.id = e.video_media_id
   WHERE e.practice_id IS NULL AND e.archived_at IS NULL AND m.practice_id IS NULL AND m.kind = 'video'
   ORDER BY e.name_nl
   LIMIT least(greatest(p_limit, 1), 20)
$$;

CREATE FUNCTION app.public_library_video(p_media uuid)
RETURNS TABLE (storage_key text, mime_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.storage_key, m.mime_type FROM media m
   WHERE m.id = p_media AND m.practice_id IS NULL AND m.kind = 'video'
     AND EXISTS (SELECT 1 FROM exercises e WHERE e.video_media_id = m.id AND e.practice_id IS NULL AND e.archived_at IS NULL)
$$;

REVOKE ALL ON FUNCTION app.public_showcase(int), app.public_library_video(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.public_showcase(int), app.public_library_video(uuid) TO fp_app;
