-- CRM: główna tabela klientów 360°
CREATE TABLE IF NOT EXISTS clients_360 (
  client_id                 text            PRIMARY KEY,
  first_order               timestamptz,
  last_order                timestamptz,
  orders_count              integer         DEFAULT 0,
  ltv                       numeric(10,2)   DEFAULT 0,
  legacy_segment            text            CHECK (legacy_segment IN ('Diamond','Platinum','Gold','Returning','New')),
  risk_level                text            CHECK (risk_level IN ('OK','Risk','HighRisk','Lost')),
  winback_priority          text,
  ulubiony_swiat            text,
  worlds_list               jsonb,
  events_list               jsonb,
  purchase_frequency_yearly numeric(5,2),
  full_order_history        jsonb,
  created_at                timestamptz     DEFAULT now(),
  updated_at                timestamptz     DEFAULT now()
);

-- Automatyczna aktualizacja updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_360_updated_at
  BEFORE UPDATE ON clients_360
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE clients_360 ENABLE ROW LEVEL SECURITY;

-- Authenticated users: tylko SELECT
CREATE POLICY "clients_360_select"
  ON clients_360
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: tylko service_role (domyślnie ma dostęp, blokujemy resztę)
CREATE POLICY "clients_360_insert"
  ON clients_360
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "clients_360_update"
  ON clients_360
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clients_360_delete"
  ON clients_360
  FOR DELETE
  TO service_role
  USING (true);
