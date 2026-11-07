-- WhatsApp/phone assistant ("agents"): conversation history, callback requests and webhook
-- de-duplication. Not linked to patients or practices: the assistant talks to anyone who messages
-- or calls the practice number, identified only by phone number.
--
-- Access: fp_app only, and only inside a transaction that set app.agent = 'on' (see
-- server/src/agents/store.ts). Regular API routes never set it, so they cannot read these rows.
-- Retention: rows are deleted after AGENT_RETENTION_DAYS (default 90) by the assistant itself.

CREATE TABLE agent_conversations (
  id bigserial PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'voice')),
  session_key text NOT NULL CHECK (length(session_key) <= 100),       -- phone number or Twilio CallSid
  customer_phone text NOT NULL CHECK (length(customer_phone) <= 32),
  messages jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(messages) = 'array'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'handoff', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_conversations_session ON agent_conversations (channel, session_key, id DESC);
CREATE INDEX agent_conversations_updated ON agent_conversations (updated_at);

CREATE TABLE agent_callback_requests (
  id bigserial PRIMARY KEY,
  customer_name text NOT NULL CHECK (length(customer_name) <= 200),
  customer_phone text NOT NULL CHECK (length(customer_phone) <= 32),
  reason text NOT NULL CHECK (length(reason) <= 1000),
  preference text NOT NULL DEFAULT '' CHECK (length(preference) <= 500),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'voice')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_callback_requests_created ON agent_callback_requests (created_at);

CREATE TABLE agent_processed_messages (
  message_id text PRIMARY KEY CHECK (length(message_id) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_processed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_only ON agent_conversations FOR ALL TO fp_app
  USING (current_setting('app.agent', true) = 'on') WITH CHECK (current_setting('app.agent', true) = 'on');
CREATE POLICY agent_only ON agent_callback_requests FOR ALL TO fp_app
  USING (current_setting('app.agent', true) = 'on') WITH CHECK (current_setting('app.agent', true) = 'on');
CREATE POLICY agent_only ON agent_processed_messages FOR ALL TO fp_app
  USING (current_setting('app.agent', true) = 'on') WITH CHECK (current_setting('app.agent', true) = 'on');

GRANT SELECT, INSERT, UPDATE, DELETE ON agent_conversations, agent_callback_requests, agent_processed_messages TO fp_app;
GRANT USAGE ON SEQUENCE agent_conversations_id_seq, agent_callback_requests_id_seq TO fp_app;
