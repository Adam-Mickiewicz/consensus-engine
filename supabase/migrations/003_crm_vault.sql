-- CRM Vault: tabela łącząca anonimowy hash z client_id
-- emails are never stored, only MD5 hash

CREATE TABLE IF NOT EXISTS master_key (
  id          serial      PRIMARY KEY,
  email_hash  text        UNIQUE NOT NULL, -- MD5 emaila (lowercase), nigdy sam email
  client_id   text        UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE master_key ENABLE ROW LEVEL SECURITY;

-- Żaden authenticated user nie ma dostępu — tylko service_role
-- (brak policy dla 'authenticated' = brak dostępu)

CREATE POLICY "master_key_service_role"
  ON master_key
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
