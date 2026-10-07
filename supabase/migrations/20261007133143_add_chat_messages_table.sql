/*
# Add chat messages table

1. New Tables
- `chat_messages` — Stores chat conversations with knowledge packages
  - id (uuid, PK), package_id (FK), role (user/assistant), content, tokens_used, provider, created_at
2. Security
- Enable RLS on chat_messages.
- Allow anon + authenticated CRUD (single-tenant, no auth).
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES knowledge_packages(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tokens_used integer DEFAULT 0,
  provider text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_package ON chat_messages(package_id);
