-- Jarvis conversation sessions and message history.
CREATE SCHEMA IF NOT EXISTS jarvis;

CREATE TABLE jarvis.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jarvis_sessions_user_updated
  ON jarvis.sessions (user_id, updated_at DESC);

CREATE TABLE jarvis.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES jarvis.sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'jarvis')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jarvis_messages_session
  ON jarvis.messages (session_id, created_at);