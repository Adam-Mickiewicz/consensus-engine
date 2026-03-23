-- Migracja 038: dodaj kolumnę email do master_key
--
-- KONTEKST:
--   master_key przechowywała tylko email_hash (MD5) + client_id.
--   MD5 jest jednostronny — emaile historycznych klientów są nieodwracalne.
--   Dodajemy kolumnę email (nullable) dla nowych importów i re-importu.
--
-- PO MIGRACJI:
--   - Istniejące rekordy: email = NULL (hash nie da się odwrócić)
--   - Nowe importy: ETL zapisuje email obok hasha
--   - Re-import pełny: uzupełni emaile dla wszystkich klientów
--
-- BEZPIECZEŃSTWO:
--   - Kolumna email jest dostępna wyłącznie przez service_role (RLS)
--   - Każdy eksport logowany w vault_access_log

ALTER TABLE master_key ADD COLUMN IF NOT EXISTS email text;

-- Indeks dla szybkiego lookup email → client_id (eksport edrone)
CREATE INDEX IF NOT EXISTS master_key_email_idx ON master_key (email)
  WHERE email IS NOT NULL;

COMMENT ON COLUMN master_key.email IS
  'Plain email — nullable. Wypełniany przez ETL przy imporcie. '
  'Historyczne rekordy przed migracją 038 mają NULL. '
  'Dostęp wyłącznie service_role. Nigdy nie eksponować przez publiczne API.';
