# Pipeline danych i harmonogram

## Codzienny pipeline (automatyczny)

```
06:00 UTC ─── Vercel Cron ──────────────────────────────────────────────
              /api/cron/segment-snapshot
              └─► take_segment_snapshot()
                  Upsert snapshotu clients_360 → segment_snapshots
                  (1 wiersz per klient per dzień)

09:00 UTC ─── Vercel Cron ──────────────────────────────────────────────
              /api/cron/sync-orders (maxDuration: 800s)
              └─► Shoper API: pobiera zamówienia z ostatnich 2 dni
                  └─► Upsert: master_key (email_hash → client_id)
                  └─► Upsert: client_product_events (linie zamówień)
                  └─► Upsert: clients_360 (nowi klienci)

10:00 UTC ─── Supabase pg_cron (NIE Vercel) ────────────────────────────
              Cron name: recalculate-crm-daily
              └─► recalculate_all_ltv()
                  Przelicza: orders_count, ltv, first_order, last_order,
                  legacy_segment, risk_level dla wszystkich klientów
                  (na podstawie client_product_events)
              └─► refresh_crm_views()
                  Odświeża WSZYSTKIE materialized views (concurrent)

10:30 UTC ─── Vercel Cron ──────────────────────────────────────────────
              /api/cron/recalculate-scores
              Równolegle:
              ├─► recalculate_rfm_scores()     → aktualizuje RFM kolumny
              ├─► recalculate_predictive_scores() → predictive kolumny
              ├─► recalculate_gift_scores()    → gift_score, gift_label
              └─► recalculate_lead_scores()    → lead_score, lead_temperature
              Następnie:
              ├─► refresh_view_rfm_distribution()
              ├─► refresh_view_lead_distribution()
              ├─► refresh_view_gift_distribution()
              └─► refresh_view_launch_monitor()
```

## Harmonogram cron (vercel.json)

| Czas (cron) | Czas UTC | Endpoint | Co robi |
|---|---|---|---|
| `0 6 * * *` | 06:00 | `/api/cron/segment-snapshot` | Snapshot segmentów |
| `0 9 * * *` | 09:00 | `/api/cron/sync-orders` | Sync zamówień Shoper |
| `0 10 * * *` | 10:00 | `/api/cron/recalculate-crm` | (pg_cron w Supabase, nie Vercel) |
| `30 10 * * *` | 10:30 | `/api/cron/recalculate-scores` | RFM + scoring |
| `* * * * *` | co minutę | `/api/cron/process-video-jobs` | Niezwiązany z CRM (inne feature) |

> **Uwaga**: `recalculate-crm` w `vercel.json` to relikt — rzeczywiste przeliczanie LTV i refresh views jest uruchamiane przez **pg_cron wewnątrz Supabase**, a nie przez Vercel. Vercel cron dla tego endpointu może nie istnieć lub być wyłączony.

## Autoryzacja cron endpointów

Wszystkie cron endpointy wymagają nagłówka:
```
Authorization: Bearer CRON_SECRET
```
Vercel automatycznie dołącza ten nagłówek przy wywołaniu cron. Do ręcznego testu użyj:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://twoja-domena.vercel.app/api/cron/segment-snapshot
```

---

## Ręczne operacje

### Po imporcie danych z CSV (`/crm/import`)

1. Upload CSV przez UI → dane lądują w `client_product_events` i `clients_360` (nowi klienci)
2. Uruchom w Supabase SQL Editor:
   ```sql
   SELECT recalculate_all_ltv();
   ```
3. Uruchom odświeżenie views:
   ```sql
   SELECT refresh_crm_views();
   ```
   Jeśli timeout, użyj osobnych RPCs (po jednym):
   ```sql
   SELECT refresh_view_dashboard_kpis();
   SELECT refresh_view_revenue_monthly();
   -- ... itd.
   ```
4. Uruchom scoring:
   ```sql
   SELECT recalculate_rfm_scores();
   SELECT recalculate_predictive_scores();
   SELECT recalculate_gift_scores();
   SELECT recalculate_lead_scores();
   ```
5. Odśwież matviews scoringowe:
   ```sql
   SELECT refresh_view_rfm_distribution();
   SELECT refresh_view_lead_distribution();
   SELECT refresh_view_gift_distribution();
   SELECT refresh_view_launch_monitor();
   ```

### Ręczne odświeżenie wszystkich widoków

```sql
SELECT refresh_crm_views();
```

Jeśli `refresh_crm_views()` timeoutuje (>30s), użyj osobnych wywołań:
```sql
SELECT refresh_view_promo_share();
SELECT refresh_view_dashboard_kpis();
SELECT refresh_view_product_performance();
SELECT refresh_view_lifecycle_funnel();
SELECT refresh_view_time_to_second_order();
SELECT refresh_view_cohort_retention();
SELECT refresh_view_promo_scorecard();
SELECT refresh_view_opportunity_queue();
SELECT refresh_view_revenue_monthly();
SELECT refresh_view_repeat_ladder();
SELECT refresh_view_season_performance();
SELECT refresh_view_cross_sell();
SELECT refresh_view_promo_dependency();
SELECT refresh_view_overview();
SELECT refresh_view_risk();
SELECT refresh_view_rfm_distribution();
SELECT refresh_view_customer_journey();
SELECT refresh_view_journey_transitions();
SELECT refresh_view_launch_monitor();
SELECT refresh_view_lead_distribution();
SELECT refresh_view_gift_distribution();
```

### Przez UI (admin)

- `POST /api/crm/refresh-views` — odświeżenie widoków przez API
- `POST /api/crm/recalculate-ltv-full` — pełne przeliczenie LTV

### Ręczne wyzwolenie cron (przez terminal)

```bash
# Sync zamówień
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://twoja-domena.vercel.app/api/cron/sync-orders

# Segment snapshot
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://twoja-domena.vercel.app/api/cron/segment-snapshot

# Recalculate scores
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://twoja-domena.vercel.app/api/cron/recalculate-scores
```

---

## Synchronizacja zamówień Shoper — szczegóły

**Endpoint**: `/api/cron/sync-orders/route.js`  
**Źródło**: Shoper REST API (`SHOPER_URL`, autoryzacja: `Bearer SHOPER_CLIENT_SECRET`)  
**Okno czasowe**: ostatnie 2 dni (nie pełna historia)

**Algorytm**:
1. Pobiera zamówienia ze Shopera stronicami po 50 (4 strony równolegle)
2. Dla każdego zamówienia:
   - Hashuje email klienta (MD5 lowercase) → `client_id = 'NZ-' + hash[0:10].toUpperCase()`
   - Szyfruje PII (email, imię, nazwisko) AES-256-GCM → `email_encrypted`, itp.
   - Upsert do `master_key`
   - Upsert do `clients_360` (podstawowe pola)
   - Upsert do `client_product_events` (linie zamówienia)
3. Retry logic: 3 próby, 1s delay, 5s delay przy 429 (rate limit)
4. Batch upsert: 200 rekordów naraz

**Ważne**: cron sync-orders **nie przelicza LTV ani segmentów** — to robi pg_cron o 10:00.

---

## Segment snapshots — szczegóły

**Endpoint**: `/api/cron/segment-snapshot/route.js`  
**Cel**: Umożliwienie analizy migracji klientów między segmentami w czasie.

**Działanie**: `take_segment_snapshot()` wykonuje UPSERT:
```sql
INSERT INTO segment_snapshots (snapshot_date, client_id, legacy_segment, risk_level, ltv, orders_count)
SELECT CURRENT_DATE, client_id, legacy_segment, risk_level, ltv, orders_count
FROM clients_360
ON CONFLICT (snapshot_date, client_id) DO UPDATE SET ...
```

**Użycie**: Strona Lifecycle → (sub-sekcja Segment Migration), endpoint `/api/crm/segment-migration`.  
**Wymaganie**: Minimum 2 snapshoty z różnych dat — inaczej migracja nie jest dostępna.

---

## Audyt danych (operacje jednorazowe)

### Naprawa segmentów

Jeśli segmenty są błędne, przelicz ręcznie:
```sql
-- 1. Zaktualizuj legacy_segment
UPDATE clients_360 SET
  legacy_segment = CASE
    WHEN orders_count >= 15 THEN 'Diamond'
    WHEN orders_count >= 8  THEN 'Platinum'
    WHEN orders_count >= 3  THEN 'Gold'
    WHEN orders_count >= 2  THEN 'Returning'
    ELSE 'New'
  END;

-- 2. Zaktualizuj risk_level (przykładowe progi)
UPDATE clients_360 SET
  risk_level = CASE
    WHEN days_since_last_order > 365 THEN 'Lost'
    WHEN days_since_last_order > 180 THEN 'HighRisk'
    WHEN days_since_last_order > 90  THEN 'Risk'
    ELSE 'OK'
  END;

-- 3. Przelicz wszystko
SELECT recalculate_all_ltv();
SELECT refresh_crm_views();
SELECT recalculate_rfm_scores();
SELECT recalculate_predictive_scores();
```

### Oznaczanie zakupów promo

```sql
UPDATE client_product_events SET is_promo = true
WHERE order_date BETWEEN (SELECT start_date FROM promotions WHERE id = ?)
                     AND (SELECT end_date   FROM promotions WHERE id = ?);
```

### Deduplikacja eventów

```bash
POST /api/crm/deduplicate
```
Lub bezpośrednio przez SQL — usuwa duplikaty po (client_id, ean, order_date, order_id).

### Naprawa historyczna

```bash
POST /api/crm/fix-historical
```
Endpoint do jednorazowych napraw danych historycznych.

---

## Troubleshooting

| Problem | Przyczyna | Rozwiązanie |
|---|---|---|
| Dashboard pusty / brak danych | Materialized views nie odświeżone | `SELECT refresh_crm_views()` lub osobne `refresh_view_*()` |
| RFM wszystko NULL | `recalculate_rfm_scores()` nie uruchomione | `SELECT recalculate_rfm_scores()` |
| Segment Migration "za mało snapshotów" | Cron snapshot nie działał | Uruchom `take_segment_snapshot()` ręcznie przez kilka dni |
| Sync-orders timeout | Shoper API rate limit lub wolna sieć | Sprawdź logi Vercel; cron uruchomi się następnego dnia |
| `refresh_crm_views()` timeout | Za dużo danych, długa query | Użyj osobnych `refresh_view_*()` dla każdego widoku |
| Klient nie pojawia się po imporcie | ETL nie przeliczył LTV | Uruchom `recalculate_all_ltv()` i `refresh_crm_views()` |
| GA4 ruch pusty | Problem z `GA4_PRIVATE_KEY` | Sprawdź format klucza (cudzysłowy + `\n` jako literały) |
| Lead/Gift scores NULL | `recalculate_gift_scores()` lub `recalculate_lead_scores()` nie uruchomione | Uruchom ręcznie lub poczekaj na cron 10:30 |
