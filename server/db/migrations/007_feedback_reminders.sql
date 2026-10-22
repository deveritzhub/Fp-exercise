-- In-app feedback (test phase and beyond) and opt-in push reminders for patients.

-- ---------------------------------------------------------------------------
-- Feedback: written by any signed-in user; readable by the platform admin and by
-- owners/admins of the practice it came from. Must not contain patient data (UI says so).
-- ---------------------------------------------------------------------------
CREATE TABLE feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner','admin','therapist','patient','platform_admin')),
  kind        text NOT NULL CHECK (kind IN ('idea','problem','praise')),
  message     text NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  page        text CHECK (length(page) <= 200),
  device      text CHECK (length(device) <= 200),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON feedback(practice_id, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON feedback FROM PUBLIC;
GRANT SELECT, INSERT ON feedback TO fp_app;
CREATE POLICY feedback_insert ON feedback FOR INSERT TO fp_app WITH CHECK (
  user_id = app.uid()
  AND (practice_id IS NULL OR app.is_member(practice_id) OR practice_id IN (SELECT app.my_patient_practice_ids()))
);
CREATE POLICY feedback_read ON feedback FOR SELECT TO fp_app USING (
  app.is_platform_admin() OR (practice_id IS NOT NULL AND app.is_practice_admin(practice_id)) OR user_id = app.uid()
);

-- ---------------------------------------------------------------------------
-- Push reminders. Handled by the auth service role: subscriptions are device
-- credentials, and the scheduler runs without a signed-in user.
-- ---------------------------------------------------------------------------
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE CHECK (length(endpoint) <= 1000),
  p256dh     text NOT NULL CHECK (length(p256dh) <= 200),
  auth       text NOT NULL CHECK (length(auth) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON push_subscriptions(user_id);

CREATE TABLE reminder_settings (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled      boolean NOT NULL DEFAULT true,
  time_local   time NOT NULL DEFAULT '18:00',   -- Europe/Amsterdam
  last_sent_on date,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Server-generated secrets that must survive restarts (e.g. the VAPID key pair for web push).
CREATE TABLE server_secrets (
  name       text PRIMARY KEY,
  value      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions, reminder_settings, server_secrets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions, reminder_settings TO fp_auth;
GRANT SELECT, INSERT ON server_secrets TO fp_auth;
CREATE POLICY auth_push ON push_subscriptions TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_reminders ON reminder_settings TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY auth_secrets ON server_secrets TO fp_auth USING (true) WITH CHECK (true);

/**
 * Patients whose reminder is due: enabled, the set time passed less than 3 hours ago, not yet sent
 * today, a training is planned today in an active programme, and no workout completed today.
 * Returns user ids only (no clinical content). Callable by the auth role only.
 */
CREATE FUNCTION app.due_reminders(p_today date, p_now time)
RETURNS TABLE(user_id uuid, locale text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.user_id, u.locale
    FROM reminder_settings r
    JOIN users u ON u.id = r.user_id AND u.disabled_at IS NULL
    JOIN patients pt ON pt.user_id = r.user_id AND pt.archived_at IS NULL
   WHERE r.enabled
     AND r.time_local <= p_now AND p_now - r.time_local < interval '3 hours'
     AND (r.last_sent_on IS NULL OR r.last_sent_on < p_today)
     AND EXISTS (
       SELECT 1 FROM programs pr JOIN program_items i ON i.program_id = pr.id
        WHERE pr.patient_id = pt.id AND pr.status = 'active'
          AND coalesce(pr.start_date, pr.activated_at::date, p_today) <= p_today
          AND (pr.end_date IS NULL OR pr.end_date >= p_today)
          AND extract(isodow FROM p_today)::smallint = ANY (i.days))
     AND NOT EXISTS (
       SELECT 1 FROM workout_sessions s
        WHERE s.patient_id = pt.id AND s.completed_at IS NOT NULL
          AND (s.completed_at AT TIME ZONE 'Europe/Amsterdam')::date = p_today)
$$;
REVOKE ALL ON FUNCTION app.due_reminders(date, time) FROM PUBLIC, fp_app;
GRANT EXECUTE ON FUNCTION app.due_reminders(date, time) TO fp_auth;
