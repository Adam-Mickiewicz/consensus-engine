# Baza danych

Supabase (PostgreSQL). Wszystkie tabele mają włączone Row Level Security (RLS). Authenticated users mają SELECT na tabelach publicznych; INSERT/UPDATE/DELETE tylko przez service_role (API routes).

---

## Tabele główne

### `clients_360`
Główna tabela klientów — jeden wiersz na klienta. Przeliczana codziennie przez `recalculate_all_ltv()`.

| Kolumna | Typ | Opis |
|---|---|---|
| `client_id` | text (PK) | Unikalny identyfikator: `NZ-` + 10 znaków hex (MD5 emaila) |
| `first_order` | timestamptz | Data pierwszego zamówienia |
| `last_order` | timestamptz | Data ostatniego zamówienia |
| `orders_count` | integer | Łączna liczba zamówień |
| `ltv` | numeric(10,2) | Lifetime Value (suma wartości zamówień) |
| `legacy_segment` | text | `Diamond` / `Platinum` / `Gold` / `Returning` / `New` |
| `risk_level` | text | `OK` / `Risk` / `HighRisk` / `Lost` |
| `winback_priority` | text | Priorytet winback (opcjonalne) |
| `ulubiony_swiat` | text | Dominujący "świat" klienta (z taksonomii produktów) |
| `worlds_list` | jsonb | Lista światów z udziałami % |
| `events_list` | jsonb | Uproszczona historia eventów |
| `purchase_frequency_yearly` | numeric(5,2) | Średnia liczba zamówień na rok |
| `full_order_history` | jsonb | Pełna historia zamówień (JSON) |
| `rfm_recency_score` | int | RFM Recency: 1–5 (5 = najnowszy) |
| `rfm_frequency_score` | int | RFM Frequency: 1–5 (5 = najczęstszy) |
| `rfm_monetary_score` | int | RFM Monetary: 1–5 (5 = najwyższe LTV) |
| `rfm_total_score` | int | Suma RFM: 3–15 |
| `rfm_segment` | text | Segment RFM: Champions / Loyal / Potential Loyal / Recent / Promising / Need Attention / About to Sleep / Cant Lose / At Risk / Lost / Hibernating / Other |
| `purchase_probability_30d` | numeric | Prawdopodobieństwo zakupu w ciągu 30 dni (0–100) |
| `predicted_ltv_12m` | numeric | Prognozowane LTV na kolejne 12 miesięcy |
| `predicted_next_order` | date | Przewidywana data następnego zamówienia |
| `avg_days_between_orders` | numeric | Średnia liczba dni między zamówieniami |
| `days_since_last_order` | int | Dni od ostatniego zakupu |
| `customer_health_score` | int | Wynik zdrowia klienta: 0–100 |
| `gift_score` | int | Wskaźnik preferencji prezentowych: 0–100 |
| `gift_label` | text | `Głównie prezenty` / `Mix: siebie + prezenty` / `Głównie dla siebie` |
| `lead_score` | int | Lead score: 0–100 |
| `lead_temperature` | text | `Hot` / `Warm` / `Cool` / `Cold` |
| `top_domena` | text | Główna domena/świat klienta (kolumna używana w filtrach) |
| `created_at` | timestamptz | Data created |
| `updated_at` | timestamptz | Data last update (auto-trigger) |

**RLS**: SELECT dla `authenticated`, INSERT/UPDATE/DELETE tylko `service_role`.

---

### `client_product_events`
Historia zakupów — jeden wiersz na linię zamówienia (produkt × zamówienie).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | bigserial (PK) | Auto ID |
| `client_id` | text (FK → clients_360) | Klient |
| `ean` | bigint (FK → products) | EAN produktu (NULL jeśli nieznany) |
| `product_name` | text | Nazwa produktu (z Shoper) |
| `order_date` | timestamptz | Data zamówienia |
| `quantity` | integer | Ilość sztuk |
| `line_total` | numeric(8,2) | Wartość linii zamówienia |
| `season` | text | Sezon zakupu (np. `GWIAZDKA`, `WALENTYNKI`) |
| `order_id` | text | ID zamówienia w Shoper |
| `order_sum` | numeric | Suma całego zamówienia |
| `is_promo` | boolean | Czy zakup był w trakcie promocji |
| `is_new_product` | boolean | Czy produkt był nowy |
| `price_category_id` | text | ID kategorii cenowej (do mapowania) |
| `created_at` | timestamptz | Data created |

**Indeksy**: `idx_cpe_client_id`, `idx_cpe_ean`, `idx_cpe_order_date`.

---

### `products`
Taksonomia produktów — jeden wiersz na EAN.

| Kolumna | Typ | Opis |
|---|---|---|
| `ean` | bigint (PK) | Europejski Numer Artykułu |
| `name` | text | Nazwa produktu |
| `variant` | text | Wariant (rozmiar, kolor) |
| `collection` | text | Kolekcja |
| `product_group` | text | Grupa produktowa |
| `tags_granularne` | text[] | Tagi granularne (np. `koty`, `literatura`, `Polska`) |
| `tags_domenowe` | text[] | Tagi domenowe (światy) |
| `filary_marki` | text[] | Filary marki |
| `okazje` | text[] | Okazje (np. `DZIEN_MATKI`, `SWIETA`) |
| `segment_prezentowy` | text | Segment prezentowy |
| `evergreen` | boolean | Czy produkt jest "evergreen" (ponadczasowy) |
| `price_avg` | numeric(8,2) | Średnia cena sprzedaży |
| `available` | boolean | Czy produkt jest dostępny |
| `created_at` | timestamptz | Data created |
| `updated_at` | timestamptz | Data last update |

---

### `client_taxonomy_summary`
Podsumowanie DNA klienta — tagi, filary, okazje. Jedna krotka per klient.

| Kolumna | Typ | Opis |
|---|---|---|
| `client_id` | text (PK, FK → clients_360) | Klient |
| `top_tags_granularne` | text[] | Najczęstsze tagi granularne |
| `top_tags_domenowe` | text[] | Najczęstsze tagi domenowe (światy) |
| `top_filary_marki` | text[] | Najczęstsze filary marki |
| `top_okazje` | text[] | Najczęstsze okazje zakupów |
| `top_segment` | text | Dominujący segment prezentowy |
| `evergreen_ratio` | numeric(4,2) | Udział zakupów evergreen (0–1) |
| `updated_at` | timestamptz | Data last update |

---

### `promotions`
Definicje promocji handlowych.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `promo_name` | text | Nazwa promocji |
| `promo_type` | text[] | Typy promocji |
| `discount_type` | text | Typ rabatu (np. `PROCENT`, `KWOTA`, `ŻADNE`) |
| `discount_value` | text | Wartość rabatu |
| `discount_min` | numeric | Minimalna wartość rabatu (numeryczna) |
| `category_list` | text | Lista kategorii objętych promocją |
| `product_list` | text | Lista produktów objętych promocją |
| `requires_code` | boolean | Czy wymagany kod rabatowy |
| `code_name` | text | Nazwa kodu |
| `free_shipping` | boolean | Czy darmowa dostawa |
| `start_date` | date | Data rozpoczęcia |
| `end_date` | date | Data zakończenia |
| `season` | text[] | Powiązane sezony |
| `notes` | text | Notatki |
| `created_at` | timestamptz | Data created |

---

### `client_notes`
Notatki CRM przypisane do klientów (CRUD przez UI).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | Auto UUID |
| `client_id` | text (FK → clients_360) | Klient |
| `note` | text | Treść notatki |
| `tags` | text[] | Tagi notatki |
| `note_type` | text | Typ: `general` (i inne) |
| `created_by` | text | Autor notatki (domyślnie `admin`) |
| `created_at` | timestamptz | Data created |
| `updated_at` | timestamptz | Data last update |

---

### `user_dashboard_config`
Konfiguracja widgetów Executive Dashboard per użytkownik.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid (PK) | Auto UUID |
| `user_id` | text | ID użytkownika (domyślnie `default`) |
| `config_name` | text | Nazwa konfiguracji (domyślnie `Mój dashboard`) |
| `widgets` | jsonb | Lista widgetów w kolejności (tablica stringów) |
| `is_default` | boolean | Czy jest domyślną konfiguracją |
| `created_at` | timestamptz | Data created |
| `updated_at` | timestamptz | Data last update |

**Unique**: `(user_id, config_name)`.

---

### `segment_snapshots`
Codzienne snapshoty segmentów klientów (do analizy migracji).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | bigint (PK, GENERATED ALWAYS AS IDENTITY) | Auto ID |
| `snapshot_date` | date | Data snapshotu |
| `client_id` | text | Klient |
| `legacy_segment` | text | Segment klienta w dniu snapshotu |
| `risk_level` | text | Poziom ryzyka w dniu snapshotu |
| `ltv` | numeric | LTV w dniu snapshotu |
| `orders_count` | integer | Liczba zamówień w dniu snapshotu |

**Unique**: `(snapshot_date, client_id)`. **Indeksy**: `idx_snapshots_date`, `idx_snapshots_client`.

---

### `master_key`
Mapowanie hash emaila ↔ client_id. Dostępna tylko przez `service_role`. Zawiera zaszyfrowane dane PII.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `email_hash` | text (UNIQUE) | MD5 emaila lowercase — nigdy sam email |
| `email` | text | Email (plain, dodany w migration 038) |
| `client_id` | text (UNIQUE) | Identyfikator klienta w CRM |
| `email_encrypted` | text | Email zaszyfrowany AES-256-GCM |
| `first_name_encrypted` | text | Imię zaszyfrowane |
| `last_name_encrypted` | text | Nazwisko zaszyfrowane |
| `created_at` | timestamptz | Data created |

**RLS**: brak dostępu dla `authenticated` — wyłącznie `service_role`.

---

### `sync_log`
Log synchronizacji danych (taksonomia, promocje).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `source` | text | Źródło: `taxonomy` / `promotions` |
| `status` | text | Status: `success` / `error` |
| `rows_upserted` | integer | Liczba upsertowanych wierszy |
| `error_message` | text | Komunikat błędu (NULL jeśli sukces) |
| `meta` | jsonb | Metadane dodatkowe |
| `triggered_at` | timestamptz | Czas uruchomienia |

---

### `vault_access_log`
Log dostępów do danych PII (kto, kiedy, co przeglądał).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `client_id` | text | Klient, którego dane odczytano |
| `accessed_by` | text | Kto odczytał (email/ID) |
| `accessed_at` | timestamptz | Kiedy |
| `user_id` | uuid | UUID użytkownika Supabase Auth |
| `ip_address` | text | Adres IP |
| `action` | text | Akcja: `view` / `export` |

---

### `world_mapping`
Mapowanie produktów do "światów" (domen tematycznych).

---

### `price_history`
Historia cen produktów w kategoriach cenowych.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `category_id` | text | Kategoria cenowa |
| `price` | numeric | Cena |
| `valid_from` | date | Data od |

---

### `category_mapping`
Mapowanie słów kluczowych z nazw produktów na kategorie cenowe.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `keyword` | text | Słowo kluczowe (lowercase) |
| `category_id` | text | ID kategorii cenowej (uppercase) |
| `created_at` | timestamptz | Data created |

---

### `ai_usage_log`
Log wywołań AI (Claude, GPT, Gemini).

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | serial (PK) | Auto ID |
| `model` | text | Nazwa modelu AI |
| `endpoint` | text | Endpoint który wywołał AI |
| `tokens_in` | integer | Tokeny wejściowe |
| `tokens_out` | integer | Tokeny wyjściowe |
| `called_at` | timestamptz | Czas wywołania |

---

### Tabele bezpieczeństwa PII (`user_roles`, `pii_sessions`, `totp_secrets`, `email_otp_codes`)

| Tabela | Opis |
|---|---|
| `user_roles` | Role użytkowników: `viewer` / `admin` |
| `pii_sessions` | Sesje dostępu do PII (czas wygaśnięcia, IP, user agent) |
| `totp_secrets` | Sekrety TOTP (zaszyfrowane AES-256-GCM) |
| `email_otp_codes` | Jednorazowe kody OTP (hash SHA-256, czas wygaśnięcia) |

---

## Materialized Views

Odświeżane codziennie przez `refresh_crm_views()` (pg_cron 10:00 UTC). Możliwe indywidualne odświeżenie przez `refresh_view_<nazwa>()`.

### `crm_dashboard_kpis`
KPI główne dashboardu (jedna krotka). Zawiera: active_90d, repeat_rate, repeat_revenue, at_risk_revenue, winback_vip_count, second_order_candidates, promo_share.

### `crm_segment_risk_matrix`
Matrix segment × risk_level z liczbą klientów i sumą LTV. Używana do heatmapy na dashboardzie.

### `crm_revenue_monthly`
Miesięczne przychody (nowi vs powracający klienci, liczba zamówień, AOV). Indeksowana po `month DESC`.

### `crm_lifecycle_funnel`
Lejek lifecycle: nowi → pierwsze zamówienie → drugie zamówienie → lojalni. Konwersje procentowe między etapami.

### `crm_worlds_performance`
Wyniki per "świat" (domena tematyczna): liczba klientów, LTV, liczba zamówień.

### `crm_promo_share`
Udział transakcji promocyjnych vs pełnopłatnych (jedna krotka).

### `crm_cohort_retention`
Retencja kohort miesięcznych. Kolumny: `cohort_month`, `months_after`, wskaźniki retencji. PK: `(cohort_month, months_after)`.

### `crm_time_to_second_order`
Rozkład czasu do drugiego zamówienia w bucketach dni. PK: `bucket`.

### `crm_cohort_by_context`
Kohorty według kontekstu (sezon, okazja zakupu). PK: `(context_group, context_type)`.

### `crm_product_performance`
Wyniki sprzedażowe per produkt (EAN + nazwa): przychód, liczba klientów, AOV, retention. PK: `(ean, product_name)`.

### `crm_season_performance`
Wyniki sprzedażowe per sezon i rok. PK: `(season, year)`.

### `crm_cross_sell`
Pary produktów kupowanych razem (co-buying). PK: `(product_a, product_b)`.

### `crm_repeat_ladder`
Rozkład klientów według liczby zamówień (1, 2, 3, ... buckets). PK: `bucket`.

### `crm_promo_scorecard`
Wyniki każdej promocji: przychód, liczba transakcji, unikalni klienci, AOV, promo share, udział nowych klientów. PK: `(promo_name, start_date)`.

### `crm_opportunity_queue`
Kolejka actionable segmentów dla Akcji CRM: 6 predefiniowanych grup z liczebnością, LTV, sugestią akcji. Sortowana po `sort_order`.

### `crm_promo_dependency`
Analiza uzależnienia klientów od promocji: ile % zakupów danego klienta jest promo. PK: `(dependency_bucket)`.

### `crm_rfm_distribution`
Rozkład klientów według segmentów RFM (Champions, Loyal, itp.) z avg LTV i liczebnością. PK: `rfm_segment`.

### `crm_customer_journey`
Etapy customer journey: liczba klientów na każdym etapie (First Visit → First Order → Repeat Buyer → Loyal → Champion). PK: `(stage, sub_stage)`.

### `crm_journey_transitions`
Przejścia między etapami journey w czasie. PK: `(from_stage, to_stage)`.

### `crm_launch_monitor`
Monitor nowych produktów: sprzedaż i adopcja per EAN w ciągu ostatnich 30/60/90 dni. PK: `ean`.

### `crm_lead_distribution`
Rozkład klientów według lead temperature (Hot/Warm/Cool/Cold) z avg lead_score. PK: `lead_temperature`.

### `crm_gift_distribution`
Rozkład klientów według gift_label. PK: `gift_label`.

### `crm_tag_stats`
Statystyki tagów produktów (granularne, domenowe, filary, okazje): liczba klientów, LTV per tag.

### `crm_behavior_segments` (materialized)
Zachowania zakupowe per segment klientów: udział promo, avg basket, timing zakupów.

### `crm_behavior_seasons`, `crm_behavior_promos`, `crm_behavior_product_groups`, `crm_behavior_tags`
Analiza zachowań według sezonów, promocji, grup produktowych i tagów.

### Starsze views (migration 013)
`crm_overview`, `crm_segments`, `crm_risk`, `crm_worlds`, `crm_occasions`, `crm_cohorts`, `crm_segment_worlds`, `crm_behavior_segments` (starsza wersja).

### Zwykłe views (nie materialized)
- `crm_predictive_ltv` — predykcje LTV per klient
- `crm_predictive_summary` — podsumowanie predykcji
- `crm_next_purchase_calendar` — kalendarz przewidywanych zakupów
- `unmapped_products` — produkty bez taksonomii
- `crm_behavior_promo`, `crm_behavior_basket`, `crm_behavior_timing`, `crm_behavior_loyalty`, `crm_behavior_cobuying` — analityka zachowań (views, nie materialized)
- `crm_occasion_retention`, `crm_occasion_loyal`, `crm_occasion_first`, `crm_occasion_ltv`, `crm_occasion_drift` — analityka okazji
- `crm_segment_collectors`, `crm_segment_single_product`, `crm_segment_world_evolution`, `crm_segment_churn_risk`, `crm_segment_summary` — zaawansowane segmenty

---

## SQL Functions

### `recalculate_all_ltv()`
Przelicza LTV, orders_count, first_order, last_order, legacy_segment, risk_level dla wszystkich klientów na podstawie `client_product_events`. Uruchamiana przez pg_cron o 10:00 UTC lub ręcznie.

### `refresh_crm_views()`
Odświeża wszystkie materialized views (REFRESH MATERIALIZED VIEW CONCURRENTLY). Uruchamiana po `recalculate_all_ltv()`. Może trwać kilka minut.

### `recalculate_rfm_scores()`
Przelicza RFM scores (recency/frequency/monetary 1–5 przez NTILE) i przypisuje segment RFM. Zwraca `{updated: N, timestamp}`. Uruchamiana przez cron 10:30 UTC.

### `recalculate_predictive_scores()`
Przelicza `avg_days_between_orders`, `predicted_next_order`, `purchase_probability_30d`, `predicted_ltv_12m`, `customer_health_score`. Używa prostego modelu statystycznego (nie ML). Uruchamiana przez cron 10:30 UTC.

### `recalculate_gift_scores()`
Oblicza `gift_score` (0–100) i `gift_label` na podstawie sezonów zakupów, tagów prezentowych produktów i okazji. Uruchamiana przez cron 10:30 UTC.

### `recalculate_lead_scores()`
Oblicza `lead_score` (0–100) i `lead_temperature` na podstawie: recency, frequency, LTV, sezonu, prawdopodobieństwa zakupu. Uruchamiana przez cron 10:30 UTC.

### `take_segment_snapshot()`
Wykonuje snapshot tabeli `clients_360` do `segment_snapshots` (UPSERT po dacie). Zwraca `{snapshot_date, rows}`. Uruchamiana przez cron 6:00 UTC.

### `get_segment_migration(p_from_date date, p_to_date date)`
Zwraca macierz przejść segmentów między dwoma datami (JOIN dwóch snapshotów). Używana przez `/api/crm/segment-migration`.

### `get_compare_audiences(p_group_a_segments, p_group_a_risks, p_group_a_worlds, p_group_b_segments, p_group_b_risks, p_group_b_worlds)`
Porównuje dwie grupy klientów (zdefiniowane przez filtry) — zwraca KPI side-by-side: count, ltv, avg_ltv, avg_orders, rozkłady segmentów i ryzyk.

### `get_dashboard_kpis_for_range(p_from date, p_to date)`
KPI dashboardu dla zakresu dat (zamiast materialized view). Używana gdy date range picker jest aktywny.

### `get_revenue_monthly_for_range(p_from date, p_to date)`
Miesięczne przychody dla zakresu dat.

### `get_promo_share_for_range(p_from date, p_to date)`
Udział promocji dla zakresu dat.

### `get_product_performance_for_range(p_from date, p_to date)`
Wyniki produktów dla zakresu dat.

### `get_worlds_for_range(p_from date, p_to date)`
Wyniki światów dla zakresu dat.

### `get_data_granulation(p_granularity text)`
Dane z granulacją: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`. Używana w sekcji Import → Data Overview.

### `get_ean_gaps(p_limit int DEFAULT 500)`
Zwraca EAN-y obecne w `client_product_events` ale brakujące w `products` (luki w taksonomii).

### `get_unmapped_products()`
Funkcja do pobierania produktów bez mapowania kategorii.

### `get_crm_overview(...)`
Filtrowana wersja przeglądu CRM (z parametrami filtrów).

### `get_ltv_sums()`
Agregaty LTV dla celów audytowych.

### Indywidualne refresh RPCs
Po jednej funkcji na każdy materialized view — używane gdy `refresh_crm_views()` trwa zbyt długo:

```sql
refresh_view_promo_share()
refresh_view_dashboard_kpis()
refresh_view_product_performance()
refresh_view_lifecycle_funnel()
refresh_view_time_to_second_order()
refresh_view_cohort_retention()
refresh_view_promo_scorecard()
refresh_view_opportunity_queue()
refresh_view_revenue_monthly()
refresh_view_repeat_ladder()
refresh_view_season_performance()
refresh_view_cross_sell()
refresh_view_promo_dependency()
refresh_view_overview()
refresh_view_risk()
refresh_view_rfm_distribution()
refresh_view_customer_journey()
refresh_view_journey_transitions()
refresh_view_launch_monitor()
refresh_view_lead_distribution()
refresh_view_gift_distribution()
```
