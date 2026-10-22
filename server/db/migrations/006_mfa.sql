-- Two-factor authentication (TOTP, RFC 6238) with single-use recovery codes.
-- Secrets and recovery codes are only reachable by the auth service role (fp_auth);
-- the runtime role keeps its column-level grant on users and never sees them.

ALTER TABLE users
  ADD COLUMN mfa_secret    text,     -- base32 TOTP secret; set during setup, active once mfa_enabled
  ADD COLUMN mfa_last_step bigint;   -- last accepted 30 s time step (replay protection)

ALTER TABLE auth_tokens DROP CONSTRAINT auth_tokens_kind_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_kind_check
  CHECK (kind IN ('verify_email','reset_password','invite','mfa_login'));

CREATE TABLE mfa_recovery_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  text NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON mfa_recovery_codes(user_id);

ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mfa_recovery_codes FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_recovery_codes TO fp_auth;
CREATE POLICY auth_mfa_codes ON mfa_recovery_codes TO fp_auth USING (true) WITH CHECK (true);
