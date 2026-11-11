-- FP Exercise — core schema
-- All clinical/tenant tables carry practice_id and are protected by RLS (see 002_rls.sql).
-- Conventions: uuid primary keys, timestamptz, soft-archive via archived_at.

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- SaaS: plans & practices (tenants)
-- ---------------------------------------------------------------------------
CREATE TABLE plans (
  code              text PRIMARY KEY,
  name              text NOT NULL,
  price_month_cents integer,            -- null = on request
  price_year_cents  integer,
  limits            jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"therapists":3,"active_patients":150}
  features          text[] NOT NULL DEFAULT '{}',
  sort_order        integer NOT NULL DEFAULT 0,
  public            boolean NOT NULL DEFAULT true
);

CREATE TABLE practices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  city            text,
  country         text NOT NULL DEFAULT 'NL',
  default_locale  text NOT NULL DEFAULT 'nl' CHECK (default_locale IN ('nl','en')),
  branding        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"accent":"#...","logo_media_id":...}
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_code       text NOT NULL DEFAULT 'trial' REFERENCES plans(code),
  subscription_status text NOT NULL DEFAULT 'trialing'
                  CHECK (subscription_status IN ('trialing','active','past_due','canceled','none')),
  trial_ends_at   timestamptz,
  billing_customer_ref text,           -- external billing provider id (Stripe) – not used yet
  created_at      timestamptz NOT NULL DEFAULT now(),
  archived_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL UNIQUE CHECK (length(email) <= 254),
  password_hash     text,                -- null until invite accepted
  full_name         text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 160),
  locale            text NOT NULL DEFAULT 'nl' CHECK (locale IN ('nl','en')),
  is_platform_admin boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  mfa_enabled       boolean NOT NULL DEFAULT false,  -- MFA enforcement: release blocker, see SECURITY.md
  failed_logins     integer NOT NULL DEFAULT 0,
  locked_until      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  disabled_at       timestamptz
);

CREATE TYPE member_role AS ENUM ('owner','admin','therapist');

CREATE TABLE practice_members (
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        member_role NOT NULL,
  title       text,                     -- e.g. "Fysiotherapeut", "Sportfysiotherapeut"
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (practice_id, user_id)
);
CREATE INDEX ON practice_members(user_id);

-- Auth sessions (opaque token, only the SHA-256 hash is stored)
CREATE TABLE auth_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  user_agent  text
);
CREATE INDEX ON auth_sessions(user_id);

-- One-time tokens: email verification, password reset, patient/staff invites
CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('verify_email','reset_password','invite')),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Development mail outbox (MAIL_TRANSPORT=outbox). Contains links, not clinical data.
CREATE TABLE mail_outbox (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email   citext NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Patients (data minimisation: no DOB, BSN, address or diagnosis fields)
-- ---------------------------------------------------------------------------
CREATE TABLE patients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id      uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,  -- linked login, once invited
  first_name   text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 80),
  last_name    text NOT NULL CHECK (length(last_name) BETWEEN 1 AND 80),
  email        citext CHECK (length(email) <= 254),
  locale       text NOT NULL DEFAULT 'nl' CHECK (locale IN ('nl','en')),
  external_ref text CHECK (length(external_ref) <= 64),   -- optional reference to the practice's EHR
  invited_at   timestamptz,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz
);
CREATE INDEX ON patients(practice_id);
CREATE UNIQUE INDEX patients_practice_email_uq ON patients(practice_id, email) WHERE email IS NOT NULL;

CREATE TABLE patient_therapists (
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, therapist_id)
);
CREATE INDEX ON patient_therapists(therapist_id);

-- ---------------------------------------------------------------------------
-- Media (private storage; file bytes live outside the DB under STORAGE_DIR)
-- ---------------------------------------------------------------------------
CREATE TABLE media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid REFERENCES practices(id) ON DELETE CASCADE,  -- null = global library media
  kind         text NOT NULL CHECK (kind IN ('video','image')),
  mime_type    text NOT NULL,
  size_bytes   bigint NOT NULL CHECK (size_bytes > 0),
  storage_key  text NOT NULL UNIQUE,
  original_name text,
  uploaded_by  uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Exercise library
-- ---------------------------------------------------------------------------
CREATE TABLE exercises (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id        uuid REFERENCES practices(id) ON DELETE CASCADE, -- null = global library
  created_by         uuid REFERENCES users(id),
  name_nl            text NOT NULL CHECK (length(name_nl) BETWEEN 2 AND 160),
  name_en            text NOT NULL CHECK (length(name_en) BETWEEN 2 AND 160),
  alt_names          text[] NOT NULL DEFAULT '{}',
  body_region        text NOT NULL,
  target_muscles     text[] NOT NULL DEFAULT '{}',
  movement_category  text,
  training_categories text[] NOT NULL DEFAULT '{}',
  equipment          text[] NOT NULL DEFAULT '{}',
  difficulty         smallint NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  starting_position_nl text NOT NULL DEFAULT '',
  starting_position_en text NOT NULL DEFAULT '',
  movement_nl        text NOT NULL DEFAULT '',
  movement_en        text NOT NULL DEFAULT '',
  instructions_nl    text NOT NULL DEFAULT '',   -- key points / cues for the patient
  instructions_en    text NOT NULL DEFAULT '',
  default_sets       smallint CHECK (default_sets BETWEEN 1 AND 20),
  default_reps       smallint CHECK (default_reps BETWEEN 1 AND 200),
  default_hold_s     smallint CHECK (default_hold_s BETWEEN 1 AND 600),
  default_rest_s     smallint CHECK (default_rest_s BETWEEN 0 AND 900),
  default_tempo      text CHECK (length(default_tempo) <= 20),
  default_frequency  text CHECK (length(default_frequency) <= 80),
  tags               text[] NOT NULL DEFAULT '{}',
  video_media_id     uuid REFERENCES media(id) ON DELETE SET NULL,
  thumbnail_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  review_status      text NOT NULL DEFAULT 'needs_clinical_review'
                     CHECK (review_status IN ('needs_clinical_review','reviewed')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  archived_at        timestamptz,
  search             tsvector
);
CREATE INDEX ON exercises(practice_id);
CREATE INDEX exercises_search_idx ON exercises USING gin(search);
CREATE INDEX exercises_region_idx ON exercises(body_region);
CREATE INDEX exercises_equipment_idx ON exercises USING gin(equipment);
CREATE INDEX exercises_training_idx ON exercises USING gin(training_categories);

CREATE FUNCTION app.exercise_search_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.name_nl,'') || ' ' || coalesce(NEW.name_en,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(array_to_string(NEW.alt_names,' ') || ' ' || array_to_string(NEW.tags,' '))), 'B') ||
    setweight(to_tsvector('simple', unaccent(array_to_string(NEW.target_muscles,' '))), 'B') ||
    setweight(to_tsvector('simple', replace(NEW.body_region || ' ' || coalesce(NEW.movement_category,'') || ' ' ||
              array_to_string(NEW.training_categories,' ') || ' ' || array_to_string(NEW.equipment,' '), '_', ' ')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER exercises_search_trg BEFORE INSERT OR UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION app.exercise_search_update();

-- Therapist-only clinical notes are a separate table so RLS can hide them from patients.
CREATE TABLE exercise_clinical_notes (
  exercise_id uuid PRIMARY KEY REFERENCES exercises(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  notes       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exercise_relations (
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  related_id  uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('regression','progression','alternative')),
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,  -- null = global relation
  PRIMARY KEY (exercise_id, related_id, kind),
  CHECK (exercise_id <> related_id)
);

CREATE TABLE exercise_favorites (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

-- ---------------------------------------------------------------------------
-- Programs & templates
-- ---------------------------------------------------------------------------
CREATE TABLE programs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id         uuid REFERENCES practices(id) ON DELETE CASCADE,  -- null only for global templates
  patient_id          uuid REFERENCES patients(id) ON DELETE CASCADE,   -- null for templates
  is_template         boolean NOT NULL DEFAULT false,
  title               text NOT NULL CHECK (length(title) BETWEEN 2 AND 160),
  description         text NOT NULL DEFAULT '',
  patient_instructions text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  start_date          date,
  end_date            date,
  version             integer NOT NULL DEFAULT 1,
  activated_at        timestamptz,
  source_template_id  uuid REFERENCES programs(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (is_template OR (patient_id IS NOT NULL AND practice_id IS NOT NULL)),
  CHECK (NOT is_template OR patient_id IS NULL),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX ON programs(practice_id);
CREATE INDEX ON programs(patient_id);

CREATE TABLE program_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id              uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  practice_id             uuid REFERENCES practices(id) ON DELETE CASCADE,
  exercise_id             uuid NOT NULL REFERENCES exercises(id),
  alternative_exercise_id uuid REFERENCES exercises(id),
  position                integer NOT NULL,
  sets                    smallint CHECK (sets BETWEEN 1 AND 20),
  reps                    smallint CHECK (reps BETWEEN 1 AND 200),
  hold_s                  smallint CHECK (hold_s BETWEEN 1 AND 600),
  rest_s                  smallint CHECK (rest_s BETWEEN 0 AND 900),
  tempo                   text CHECK (length(tempo) <= 20),
  load                    text CHECK (length(load) <= 60),
  frequency               text CHECK (length(frequency) <= 80),
  days                    smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',  -- ISO weekdays 1=Mon..7=Sun
  notes                   text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000)
);
CREATE INDEX ON program_items(program_id, position);

CREATE TABLE program_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  snapshot    jsonb NOT NULL,
  change_note text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, version)
);

CREATE TABLE template_favorites (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);

-- ---------------------------------------------------------------------------
-- Patient activity
-- ---------------------------------------------------------------------------
CREATE TABLE workout_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id  uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  program_version integer NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  difficulty   smallint CHECK (difficulty BETWEEN 0 AND 10),   -- perceived exertion/difficulty
  pain         smallint CHECK (pain BETWEEN 0 AND 10),         -- optional NRS discomfort
  feedback     text CHECK (length(feedback) <= 2000),
  reviewed_at  timestamptz,                                    -- therapist marked feedback as seen
  reviewed_by  uuid REFERENCES users(id)
);
CREATE INDEX ON workout_sessions(patient_id, started_at DESC);
CREATE INDEX ON workout_sessions(practice_id, started_at DESC);

CREATE TABLE exercise_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  practice_id     uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  program_item_id uuid REFERENCES program_items(id) ON DELETE SET NULL,
  exercise_id     uuid NOT NULL REFERENCES exercises(id),
  completed       boolean NOT NULL DEFAULT true,
  sets_done       smallint CHECK (sets_done BETWEEN 0 AND 50),
  reps_done       smallint CHECK (reps_done BETWEEN 0 AND 500),
  difficulty      smallint CHECK (difficulty BETWEEN 0 AND 10),
  pain            smallint CHECK (pain BETWEEN 0 AND 10),
  feedback        text CHECK (length(feedback) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, program_item_id)
);
CREATE INDEX ON exercise_logs(patient_id, created_at DESC);

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  kind        text NOT NULL,       -- 'program_assigned' | 'program_updated' | 'reminder' | 'feedback_received'
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  link        text,                -- in-app path only, never contains health data
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit log (append-only for the app role)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  practice_id uuid,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   uuid,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- never contains clinical free text
  ip_hash     text
);
CREATE INDEX ON audit_log(practice_id, at DESC);

-- ---------------------------------------------------------------------------
-- Public website
-- ---------------------------------------------------------------------------
CREATE TABLE contact_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email       citext NOT NULL CHECK (length(email) <= 254),
  practice    text CHECK (length(practice) <= 160),
  message     text NOT NULL CHECK (length(message) BETWEEN 5 AND 4000),
  topic       text NOT NULL DEFAULT 'demo',
  consent_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
