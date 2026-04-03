# API Routes

Wszystkie route handlery są w `app/api/crm/` (JavaScript). Domyślnie `export const dynamic = 'force-dynamic'`. Supabase client: `getServiceClient()` (service_role) z `lib/supabase/server.js`.

---

## Dashboard

### `GET /api/crm/dashboard`
Dane głównego dashboardu.

- **Params**: `date_from` (YYYY-MM-DD, opcjonalne), `date_to` (YYYY-MM-DD, opcjonalne)
- **Response**: `{ kpis, matrix, revenue, funnel, worlds, promo, errors, dateRange? }`
- **Bez date params**: odczytuje materialized views (`crm_dashboard_kpis`, `crm_segment_risk_matrix`, `crm_revenue_monthly`, `crm_lifecycle_funnel`, `crm_worlds_performance`, `crm_promo_share`)
- **Z date params**: wywołuje SQL functions (`get_dashboard_kpis_for_range`, `get_revenue_monthly_for_range`, `get_promo_share_for_range`, `get_worlds_for_range`) + statyczne widoki dla matrix i funnel
- **Cache**: `private, max-age=60` (bez dat) / `private, max-age=30` (z datami)

### `GET /api/crm/dashboard-config`
Pobiera konfigurację widgetów dashboardu.

- **Params**: `user_id` (opcjonalne, domyślnie `default`)
- **Response**: `{ configs: [...] }`
- **Tabela**: `user_dashboard_config`

### `POST /api/crm/dashboard-config`
Zapisuje konfigurację widgetów.

- **Body**: `{ user_id, config_name, widgets: string[], is_default }`
- **Response**: `{ config }`
- **Operacja**: UPSERT po `(user_id, config_name)`

---

## Klienci

### `GET /api/crm/clients/list`
Lista klientów z filtrami, sortowaniem i paginacją.

- **Params**:
  - `segment` — legacy_segment (Diamond/Platinum/Gold/Returning/New)
  - `risk` — risk_level (OK/Risk/HighRisk/Lost)
  - `world` — top_domena
  - `ltv_min`, `ltv_max` — zakres LTV (numeric)
  - `search` — szukaj po client_id (ILIKE)
  - `date_from`, `date_to` — zakres last_order
  - `rfm_segment` — segment RFM
  - `rfm_r`, `rfm_f` — konkretne scores R lub F (int)
  - `lead_temp` — lead_temperature (Hot/Warm/Cool/Cold)
  - `gift_label` — gift label
  - `sort` — `ltv_desc` (domyślne) / `ltv_asc` / `last_order_desc` / `last_order_asc` / `orders_desc` / `orders_asc` / `first_order_desc`
  - `page` — strona (domyślnie 1)
  - `per_page` — wierszy na stronę (domyślnie 50)
- **Response**: `{ clients: [...], total, page, per_page }`
- **Kolumny**: `client_id, legacy_segment, risk_level, ltv, orders_count, last_order, first_order, top_domena, winback_priority, rfm_segment, rfm_total_score, customer_health_score, purchase_probability_30d, lead_temperature, gift_label`

### `GET /api/crm/clients/[id]`
Pełny profil klienta 360°.

- **Response**: `{ profile, events, taxonomy, prediction }`
  - `profile` — wszystkie kolumny z `clients_360`
  - `events` — do 500 ostatnich zdarzeń z `client_product_events`
  - `taxonomy` — dane z `client_taxonomy_summary` (nullable)
  - `prediction` — dane z `crm_predictive_ltv` (nullable)
- **Errors**: 404 jeśli klient nie istnieje

### `GET /api/crm/clients/[id]/notes`
Lista notatek klienta.

- **Response**: `{ notes: [...] }`

### `POST /api/crm/clients/[id]/notes`
Dodaje notatkę do klienta.

- **Body**: `{ note: string, tags?: string[], note_type?: string }`
- **Response**: `{ note }`

### `DELETE /api/crm/clients/[id]/notes`
Usuwa notatkę.

- **Params**: `note_id` (query param)
- **Response**: `{ success: true }`

### `GET /api/crm/clients/export`
Eksport listy klientów do CSV (max 10 000 rekordów).

- **Params**: `segment`, `risk`, `world`, `ltv_min`, `ltv_max`, `search`, `sort`
- **Response**: CSV (`text/csv`)
- **Kolumny**: `client_id, legacy_segment, risk_level, ltv, orders_count, last_order, first_order, top_domena, winback_priority`

### `GET /api/crm/clients/export-edrone`
Eksport klientów do formatu edrone (z tagami CRM). Wymaga odszyfrowania emaili z `master_key`.

- **Params**: `segment`, `risk`, `world`, `date_from`, `date_to`, `scope` (`all` domyślnie / `winback`)
- **Response**: CSV (`text/csv`) gotowy do importu edrone
- **Format CSV**: `email, first_name, last_name, status, subscription_date, gender, tags`
- **System tagów**: Segment, Ryzyko, Świat, Okazje, Zachowanie, LTV bucket, Ostatni zakup, Rok pierwszego zakupu
- **Bezpieczeństwo**: loguje akcję do `vault_access_log`

---

## Analityka i KPI

### `GET /api/crm/analytics/recent-orders`
Ostatnie 20 zamówień z enrichmentem o segment klienta.

- **Response**: `{ rows: [...] }` — `client_id, product_name, order_date, line_total, season, legacy_segment, risk_level`
- **Cache**: `private, max-age=60`

### `GET /api/crm/analytics/revenue-trend`
Trend przychodów miesięcznych (ostatnie 18 miesięcy).

- **Response**: `{ rows: [{ month, revenue, orders }] }`

### `GET /api/crm/analytics/top-diamonds`
Top 10 klientów Diamond według LTV.

- **Response**: `{ rows: [...] }`
- **Cache**: `private, max-age=60`

---

## Kohorty

### `GET /api/crm/cohorts`
Dane do zakładki Kohorty & Retencja.

- **Params**: `date_from`, `date_to` (filtrują zakres kohort)
- **Response**: `{ retention, timeToSecond, byContext, errors }`
  - `retention` — z `crm_cohort_retention`
  - `timeToSecond` — z `crm_time_to_second_order`
  - `byContext` — z `crm_cohort_by_context`
- **Cache**: `private, max-age=60`

---

## Lifecycle

### `GET /api/crm/lifecycle`
Dane do zakładki Lifecycle.

- **Params**: `date_from`, `date_to`
- **Response**: `{ funnel, matrix, ladder, worlds, errors }`
  - `funnel` — z `crm_lifecycle_funnel`
  - `matrix` — z `crm_segment_risk_matrix`
  - `ladder` — z `crm_repeat_ladder`
  - `worlds` — z `crm_worlds_performance` lub `get_worlds_for_range()`
- **Cache**: `private, max-age=60`

### `GET /api/crm/rfm`
Dane RFM scoring.

- **Response**: `{ distribution, heatmap, predictive: { total_predicted_ltv, avg_predicted_ltv, high_prob_count, prob_buckets }, errors }`
  - `distribution` — z `crm_rfm_distribution`
  - `heatmap` — zagregowane z `clients_360` (max 200 000 wierszy) w formacie `{ "R_F": count }`
  - `predictive` — metryki predykcyjne

### `GET /api/crm/journey`
Dane Customer Journey.

- **Response**: `{ journey, transitions, errors }`
  - `journey` — z `crm_customer_journey`
  - `transitions` — z `crm_journey_transitions` (top 100 po transition_count)
- **Cache**: `private, max-age=60`

### `GET /api/crm/segment-migration`
Migracja klientów między segmentami w czasie.

- **Params**: `from_date`, `to_date` (daty snapshotów)
- **Response**: `{ migration, availableDates, actualFrom, actualTo }` lub `{ message, availableDates }` jeśli za mało snapshotów
- **Używa**: `get_segment_migration()` RPC

---

## Produkty

### `GET /api/crm/products-analytics`
Analityka produktów, światów, sezonowości i cross-sell.

- **Params**: `sort`, `order` (`asc`/`desc`), `limit` (max 200), `date_from`, `date_to`
- **Response**: `{ products, seasons, crossSell, worlds, errors }`
  - `products` — z `crm_product_performance` lub `get_product_performance_for_range()`
  - `seasons` — z `crm_season_performance`
  - `crossSell` — z `crm_cross_sell` (top 100)
  - `worlds` — z `crm_worlds_performance` lub `get_worlds_for_range()`
- **Cache**: `private, max-age=60` (bez dat) / `private, max-age=30` (z datami)

### `GET /api/crm/launch-monitor`
Monitor nowych produktów.

- **Response**: dane z `crm_launch_monitor`

---

## Promocje

### `GET /api/crm/promotions`
Scorecard, dependency, sezonowość i lista promocji.

- **Params**: `date_from`, `date_to`
- **Response**: `{ scorecard, dependency, seasons, promotions, errors }`
  - `scorecard` — z `crm_promo_scorecard`
  - `dependency` — z `crm_promo_dependency`
  - `seasons` — z `crm_season_performance`
  - `promotions` — z tabeli `promotions` (do kalendarza)
- **Cache**: `private, max-age=30`

### `POST /api/crm/promotions`
Dodaje nową promocję.

- **Body**: `{ promo_name, discount_type, discount_value, free_shipping, start_date, end_date, season, code_name }`
- **Response**: `{ promo }`

---

## Akcje CRM

### `GET /api/crm/actions`
Opportunity Queue i opcjonalnie lista klientów dla segmentu.

- **Params**: `segment` (opcjonalne) — `vip_reactivation`, `second_order`, `falling_frequency`, `returning_at_risk`, `dormant_loyals`, `new_potential`
- **Response**: `{ opportunities, segmentClients? }`
  - `opportunities` — z `crm_opportunity_queue` (posortowane po sort_order)
  - `segmentClients` — klienci z `clients_360` dla wybranego segmentu (jeśli podano)

### `GET /api/crm/actions/export`
Eksport klientów z danego segmentu do CSV.

- **Params**: `segment` (te same wartości co wyżej)
- **Response**: CSV (`text/csv`)

### `GET /api/crm/lead-scoring`
Dane Lead Scoring.

- **Params**: `temperature` (Hot/Warm/Cool/Cold), `format` (`csv` dla eksportu)
- **Response**: `{ distribution, hot_leads, gift_distribution, errors }` lub CSV jeśli `format=csv`
  - `distribution` — z `crm_lead_distribution`
  - `hot_leads` — top Hot leads z `clients_360`
  - `gift_distribution` — z `crm_gift_distribution`

---

## Winback

### `GET /api/crm/winback`
Lista klientów do reaktywacji (Lost + HighRisk).

- **Params**: `tier` (`vip`, `lost`, `highrisk`, `all`), `world`, `segment`, `date_from`, `date_to`, `page`, `per_page`
- **Response**: `{ clients, total }`

### `GET /api/crm/winback/export`
Eksport winback do CSV.

- **Params**: `tier`, `world`, `segment`
- **Response**: CSV

---

## Porównanie grup

### `POST /api/crm/compare`
Porównanie dwóch grup klientów.

- **Body**: `{ group_a: { segments, risks, worlds }, group_b: { segments, risks, worlds } }`
- **Response**: `{ group_a: { client_count, total_ltv, avg_ltv, avg_orders, segment_distribution, risk_distribution }, group_b: {...} }`
- **Używa**: `get_compare_audiences()` RPC

---

## Ruch (GA4)

### `GET /api/crm/traffic`
Dane ruchu z Google Analytics 4.

- **Params**: `period` (7/30/90 dni), `tab` (overview/sources/funnel/products/search/devices)
- **Response**: dane GA4 dopasowane do wybranego taba
- **Źródło**: Google Analytics 4 Data API (service account via `lib/ga4.js`)

---

## Import i dane

### `GET /api/crm/import/data-overview`
Przegląd danych z granulacją czasową.

- **Params**: `granularity` (daily/weekly/monthly/quarterly/yearly)
- **Używa**: `get_data_granulation()` RPC

### `GET /api/crm/import/unmapped`
Produkty bez mapowania taksonomii (z `client_product_events`).

### `GET /api/crm/ean-gaps`
Luki EAN — produkty w eventach bez rekordu w `products`.

- **Params**: `limit` (domyślnie 500)
- **Response**: lista EAN-ów z liczebnością

---

## AI Insights

### `POST /api/crm/ai-insights`
Ogólne AI insights dla CRM (filtrowane).

- **Body**: `{ model, date_from, date_to, segment, risk, world, occasion }`
- **Domyślny model**: `claude-sonnet-4-20250514`
- **Response**: `{ insights: string }` — analiza tekstowa

### `POST /api/crm/ai-insights/segment`
AI insights dla konkretnego segmentu klientów.

- **Body**: `{ model, segment, risk, world, date_from, date_to }`

### `GET /api/crm/ai-insights/recommendations`
Rekomendacje AI dla konkretnego klienta.

- **Params**: `client_id`, `model`
- **Domyślny model**: `gpt-5.4`

### `GET /api/crm/ai-insights/winback`
AI sugestia winback dla konkretnego klienta.

- **Params**: `client_id`, `model`
- **Domyślny model**: `gemini-3-flash`

---

## Analityka zachowań

### `GET /api/crm/behavior`
Analityka zachowań zakupowych (promo, basket, timing, loyalty, segmenty).

- **Params**: `segment`, `risk`, `domena`, `tab` (segments/promo/basket/timing/loyalty)

### `GET /api/crm/behavior/cobuying`
Top 50 par produktów kupowanych razem.

- **Response**: z `crm_behavior_cobuying`

---

## Mapowanie kategorii cenowych

### `GET /api/crm/category-mapping`
Lista reguł mapowania słów kluczowych → kategorie.

### `POST /api/crm/category-mapping`
Dodaje regułę mapowania.

- **Body**: `{ keyword: string, category_id: string }`

### `GET /api/crm/category-mapping/unmapped`
Produkty bez przypisanej kategorii cenowej (grupowane po `product_name`).

---

## Bezpieczeństwo PII

### `GET /api/crm/pii`
Zarządzanie sesją PII (generowanie/walidacja kodu 2FA).

### `GET /api/crm/reveal`
Odszyfrowanie emaila klienta. Wymaga aktywnej sesji PII.

- **Params**: `client_id`
- **Response**: `{ email, first_name, last_name }`
- **Loguje**: do `vault_access_log`

---

## Operacje administracyjne

### `POST /api/crm/refresh-views`
Ręczne odświeżenie materialized views.

- **Body**: `{ view?: string }` — konkretny view lub wszystkie

### `POST /api/crm/recalculate-ltv`
Przeliczenie LTV dla pojedynczego klienta lub grupy.

### `POST /api/crm/recalculate-ltv-full`
Pełne przeliczenie LTV dla wszystkich klientów (`recalculate_all_ltv()`). Długa operacja (maxDuration: 60s).

### `POST /api/crm/deduplicate`
Deduplikacja eventów w `client_product_events`.

### `GET /api/crm/filter-options`
Opcje filtrów (dostępne światy, segmenty, itp.) do list klientów.

### `GET /api/crm/overview`, `GET /api/crm/overview-full`
Agregaty ogólne CRM (starsze endpointy, zastąpione przez dashboard).

### `GET /api/crm/predictive`
Dane predykcyjne z `crm_predictive_ltv` i `crm_predictive_summary`.

### `GET /api/crm/occasions`
Analityka okazji zakupowych (retencja, LTV per okazja).

### `GET /api/crm/segments/advanced`
Zaawansowane segmenty (kolekcjonerzy, single-product, churn risk itp.).

### `GET /api/crm/unmapped`
Produkty bez taksonomii (z widoku `unmapped_products`).

### `POST /api/crm/fix-historical`
Naprawa historycznych błędów w danych (admin).

### `GET /api/crm/audit`
Audyt danych — rozkłady, statystyki per miesiąc.

### `GET /api/crm/audit/ltv-timeline`
Oś czasu LTV z granulacją (daily/weekly/monthly/quarterly/yearly).

---

## Cron Endpoints

### `GET /api/cron/sync-orders`
Synchronizacja zamówień z Shoper API za ostatnie 2 dni.

- **Auth**: `Authorization: Bearer CRON_SECRET`
- **maxDuration**: 800s (Vercel function)
- **Operacje**: fetch z Shoper API → upsert `master_key`, `client_product_events`, `clients_360`
- **Concurrency**: 4 strony Shoper równolegle, batch 200 rekordów

### `GET /api/cron/segment-snapshot`
Wykonuje dzienny snapshot segmentów.

- **Auth**: `Authorization: Bearer CRON_SECRET`
- **Wywołuje**: `take_segment_snapshot()` RPC

### `GET /api/cron/recalculate-scores`
Przelicza scoring (RFM, predictive, gift, lead) i odświeża powiązane matviews.

- **Auth**: `Authorization: Bearer CRON_SECRET`
- **Wywołuje równolegle**: `recalculate_rfm_scores()`, `recalculate_predictive_scores()`, `recalculate_gift_scores()`, `recalculate_lead_scores()`
- **Następnie**: `refresh_view_rfm_distribution()`, `refresh_view_lead_distribution()`, `refresh_view_gift_distribution()`, `refresh_view_launch_monitor()`
- **Response**: `{ rfm, predictive, gift, lead, timestamp }`
