-- Tabela adnotacji do klientów
CREATE TABLE IF NOT EXISTS client_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients_360(client_id) ON DELETE CASCADE,
  note text NOT NULL,
  tags text[] DEFAULT '{}',
  note_type text DEFAULT 'general',
  created_by text DEFAULT 'admin',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created ON client_notes(created_at DESC);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'client_notes' AND policyname = 'Allow all for service role'
  ) THEN
    CREATE POLICY "Allow all for service role" ON client_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;
