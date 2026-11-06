-- More ways to log in: Google and Apple (OpenID Connect) and passkeys (WebAuthn, e.g. Face ID or a
-- fingerprint). Only the auth service (fp_auth) uses these tables; the app role has no access.

-- A Google or Apple account linked to a user. "subject" is the provider's stable user id.
CREATE TABLE user_identities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('google', 'apple')),
  subject      text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  email        citext CHECK (length(email) <= 254),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE (provider, subject),
  UNIQUE (user_id, provider)
);

-- Passkeys. id = the credential id (base64url); only the public key is stored.
CREATE TABLE webauthn_credentials (
  id           text PRIMARY KEY CHECK (length(id) BETWEEN 16 AND 1400),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key   bytea NOT NULL,
  counter      bigint NOT NULL DEFAULT 0,
  transports   text[] NOT NULL DEFAULT '{}',
  name         text NOT NULL DEFAULT 'Passkey' CHECK (length(name) BETWEEN 1 AND 60),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX ON webauthn_credentials(user_id);

-- Short-lived challenges for passkeys and the state of a Google/Apple login (hashed; single use).
CREATE TABLE auth_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose     text NOT NULL CHECK (purpose IN ('passkey_register', 'passkey_login', 'oauth')),
  key_hash    text NOT NULL UNIQUE,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_identities, webauthn_credentials, auth_challenges FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_identities, webauthn_credentials, auth_challenges TO fp_auth;
CREATE POLICY identities_auth ON user_identities TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY webauthn_auth ON webauthn_credentials TO fp_auth USING (true) WITH CHECK (true);
CREATE POLICY challenges_auth ON auth_challenges TO fp_auth USING (true) WITH CHECK (true);
