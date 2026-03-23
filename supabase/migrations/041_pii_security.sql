-- Migration 041: PII Security — role-based access + 2FA sessions + encrypted PII

-- ─── 1. user_roles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id         serial PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'viewer', -- 'viewer' | 'admin'
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_service_role"
  ON user_roles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 2. pii_sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pii_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE pii_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pii_sessions_own"
  ON pii_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "pii_sessions_service_role"
  ON pii_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX pii_sessions_user_expires ON pii_sessions (user_id, expires_at);

-- ─── 3. totp_secrets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS totp_secrets (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret     text NOT NULL, -- AES-256-GCM encrypted JSON
  verified   boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "totp_secrets_service_role"
  ON totp_secrets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 4. email_otp_codes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_otp_codes (
  id         serial PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  text NOT NULL, -- SHA-256 of 6-digit code
  expires_at timestamptz NOT NULL,
  used       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_otp_service_role"
  ON email_otp_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auto-cleanup: remove expired codes after 1 hour (if pg_cron available, else manual)
CREATE INDEX email_otp_user_expires ON email_otp_codes (user_id, expires_at);

-- ─── 5. master_key: add encrypted PII columns ──────────────────────────────────
ALTER TABLE master_key
  ADD COLUMN IF NOT EXISTS email_encrypted       text,
  ADD COLUMN IF NOT EXISTS first_name_encrypted  text,
  ADD COLUMN IF NOT EXISTS last_name_encrypted   text;

-- ─── 6. vault_access_log: extend ──────────────────────────────────────────────
ALTER TABLE vault_access_log
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS action     text DEFAULT 'view'; -- 'view' | 'export'
