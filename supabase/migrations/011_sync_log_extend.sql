-- Rozszerza sync_log o nowe źródła danych: shoper_api i csv_upload
-- Constraint CHECK jest immutable w Postgres — usuwamy stary, dodajemy nowy.

ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_source_check;

ALTER TABLE sync_log
  ADD CONSTRAINT sync_log_source_check
  CHECK (source IN ('taxonomy', 'promotions', 'shoper_api', 'csv_upload'));

-- Opcjonalne: dodaj pole dla metadanych runu (np. zakres dat)
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS meta jsonb;

-- Zmień nazwę kolumny triggered_at → triggered_at (nic — pozostaje)
COMMENT ON TABLE sync_log IS
  'Log uruchomień ETL i synchronizacji: taxonomy, promotions, shoper_api, csv_upload.';
