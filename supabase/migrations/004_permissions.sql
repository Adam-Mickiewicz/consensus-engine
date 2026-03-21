-- Uprawnienia użytkowników do sekcji dashboardu
CREATE TABLE IF NOT EXISTS user_permissions (
  id            serial      PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category      text        NOT NULL CHECK (category IN ('crm','products','b2b','tools','reports','admin')),
  subcategory   text        CHECK (subcategory IN ('analytics','clients','winback','import')),
  access_level  text        NOT NULL DEFAULT 'none' CHECK (access_level IN ('none','read','write')),
  created_at    timestamptz DEFAULT now(),

  UNIQUE (user_id, category, subcategory)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users: SELECT tylko własnych rekordów
CREATE POLICY "user_permissions_select_own"
  ON user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: tylko service_role
CREATE POLICY "user_permissions_insert"
  ON user_permissions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "user_permissions_update"
  ON user_permissions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "user_permissions_delete"
  ON user_permissions
  FOR DELETE
  TO service_role
  USING (true);
