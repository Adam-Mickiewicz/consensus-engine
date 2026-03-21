-- Audit log: każde odkrycie tożsamości klienta (email/hash) przez operatora
-- Dostęp do master_key wymaga wpisu w tym logu — zasada zero-trust PII.

CREATE TABLE IF NOT EXISTS vault_access_log (
  id            serial      PRIMARY KEY,
  accessed_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id     text        NOT NULL,
  accessed_at   timestamptz DEFAULT now(),
  reason        text
);

ALTER TABLE vault_access_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users: mogą logować własne dostępy (INSERT)
CREATE POLICY "vault_access_log_insert"
  ON vault_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (accessed_by = auth.uid());

-- SELECT: tylko admin (category='admin' AND access_level='write' w user_permissions)
CREATE POLICY "vault_access_log_select_admin"
  ON vault_access_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_permissions
      WHERE user_id    = auth.uid()
        AND category   = 'admin'
        AND access_level = 'write'
    )
  );

-- UPDATE: brak — logi są immutable
-- DELETE: tylko service_role (np. zgodność z RODO — prawo do usunięcia)
CREATE POLICY "vault_access_log_delete_service"
  ON vault_access_log
  FOR DELETE
  TO service_role
  USING (true);

-- Indeks dla szybkiego audytu
CREATE INDEX IF NOT EXISTS vault_access_log_client_idx   ON vault_access_log (client_id);
CREATE INDEX IF NOT EXISTS vault_access_log_accessor_idx ON vault_access_log (accessed_by);
CREATE INDEX IF NOT EXISTS vault_access_log_time_idx     ON vault_access_log (accessed_at DESC);

-- Komentarz dokumentacyjny
COMMENT ON TABLE vault_access_log IS
  'Audit trail: każde odkrycie PII (hash tożsamości) przez operatora. Immutable — brak UPDATE policy. DELETE tylko service_role (RODO). Logi NIGDY nie zawierają samego emaila.';
