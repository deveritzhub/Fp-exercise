-- The figure a professional puts together for the village: how they look when they walk there, and
-- who stands by the TV in the practice of their own patients. Appearance only; no name, no photo.
CREATE TABLE staff_avatars (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  look       jsonb NOT NULL CHECK (jsonb_typeof(look) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE staff_avatars ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON staff_avatars FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON staff_avatars TO fp_app;

-- The professionals who treat the patient behind the current login.
CREATE FUNCTION app.my_therapist_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.therapist_id FROM patient_therapists a
   WHERE a.patient_id IN (SELECT id FROM patients WHERE user_id = app.uid() AND archived_at IS NULL)
$$;

-- Read: your own figure, and the figure of a professional who treats you. Write: only your own.
CREATE POLICY avatars_read ON staff_avatars FOR SELECT TO fp_app USING (user_id = app.uid() OR user_id IN (SELECT app.my_therapist_ids()));
CREATE POLICY avatars_insert ON staff_avatars FOR INSERT TO fp_app WITH CHECK (user_id = app.uid() AND app.is_professional());
CREATE POLICY avatars_update ON staff_avatars FOR UPDATE TO fp_app USING (user_id = app.uid()) WITH CHECK (user_id = app.uid() AND app.is_professional());
