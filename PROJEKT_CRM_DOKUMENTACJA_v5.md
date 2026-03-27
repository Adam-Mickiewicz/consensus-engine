# Projekt CRM — Dokumentacja techniczna v5
**Data aktualizacji:** 27.03.2026 (wieczór)
**Repozytorium:** github.com/Adam-Mickiewicz/consensus-engine
**Stos:** Next.js 15 (App Router) · Supabase (Postgres + Edge Functions + pg_cron) · Vercel · Google Apps Script

---

## 1. Architektura systemu

### 1.1 Warstwy

```
Google Sheets (źródło danych)
    ↓ Apps Script triggers (ręcznie)
Vercel API Routes /api/sync/*
    ↓ upsert
Supabase Postgres
    ↓ pg_cron 10:00 UTC
Edge Function: recalculate-crm
    → recalculate_all_ltv()
    → refresh_crm_views()
    ↓
Next.js CRM frontend (/crm/*)
```

### 1.2 Automatyczny pipeline

| Czas (UTC) | Trigger | Akcja |
|---|---|---|
| 09:00 | Vercel cron | `GET /api/cron/sync-orders` — sync zamówień z Shoper |
| 10:00 | pg_cron: `recalculate-crm-daily` | Edge Function `recalculate-crm` → `recalculate_all_ltv()` + `refresh_crm_views()` |
| ręcznie | Apps Script (po zmianie Sheets) | sync taxonomy / promotions / price-history + `node scripts/recalculate-taxonomy.js` |

---

## 2. Baza danych

### 2.1 Kluczowe tabele

| Tabela | Opis | Rozmiar (27.03.2026) |
|---|---|---|
| `clients_360` | Profil klienta: segment, LTV, ryzyko, daty, top_domena | 150 906 klientów |
| `client_product_events` | Zdarzenia zakupowe (EAN, produkt, data, sezon, promo, koszty dostawy) | 476 738 eventów |
| `client_taxonomy_summary` | Tagi, liczniki, wzorce zakupowe, historia promocji per klient | 106 036 klientów z tagami |
| `products` | Katalog produktów z tagami domenowymi/granularnymi/filarami/okazjami | — |
| `promotions` | Promocje z datami, typami, rabatami (min/max) | 151 rekordów (2022–2026) |
| `crm_predictive_ltv` | Predykcje: LTV 12M, prawdopodobieństwo zakupu 30d, rytm | — |
| `sync_log` | Log wszystkich operacji sync | — |

### 2.2 Kolumny clients_360 (aktualny stan)

```sql
client_id, legacy_segment, risk_level, ltv, orders_count,
first_order, last_order, top_domena,
winback_priority
```

**Usunięte (legacy):**
`ulubiony_swiat`, `worlds_list`, `events_list`, `purchase_frequency_yearly`, `full_order_history`

### 2.3 Kolumny client_product_events (aktualny stan)

```sql
-- Pierwotne
client_id, order_id, ean, product_name, price_at_purchase,
quantity, line_total, order_date, season, promo_flag

-- Dodane (sesja 27.03.2026 wieczór)
promo_code        -- TEXT: kod promocyjny użyty przy zamówieniu (z Shoper API)
discount_code     -- TEXT: kod rabatowy
discount_client   -- NUMERIC: rabat per klient
shipping_cost     -- NUMERIC: koszt dostawy dla zamówienia
```

**Uwaga dot. `shipping_cost`:**
- Dla danych historycznych (przed integracją API) obliczany jako: `order_sum - SUM(line_total) per order_id`
- Zakres walidowany: 0–30 zł (wartości poza zakresem ustawiane na NULL)
- Ta sama wartość `shipping_cost` zapisywana dla wszystkich pozycji (line itemów) z tego samego `order_id`

### 2.4 Kolumny client_taxonomy_summary (aktualny stan)

```sql
-- Stare (listy top-N)
top_tags_granularne, top_tags_domenowe, top_filary_marki, top_okazje

-- Nowe (dodane sesja 27.03.2026 rano)
tags_granularne_counts   -- JSONB: {tag: count}
tags_domenowe_counts     -- JSONB: {tag: count}
filary_marki_counts      -- JSONB: {tag: count}
okazje_counts            -- JSONB: {tag: count}
top_segments             -- JSONB array: [{segment: string, count: number}]
seasons_counts           -- JSONB: {sezon: count}
product_groups_counts    -- JSONB: {kategoria: count}
new_products_ratio       -- NUMERIC: % nowości (0–100)
evergreen_count          -- INT: liczba produktów ponadczasowych
promo_count              -- INT: liczba zakupów w promocji
total_events             -- INT: łączna liczba pozycji zakupowych

-- Nowe (dodane sesja 27.03.2026 wieczór — matchowanie promocji)
promo_history            -- JSONB array: historia dopasowanych promocji
promo_seasons            -- TEXT[]: tablicaseason'ów, w których klient kupował w promocji
free_shipping_orders     -- INTEGER: liczba zamówień z darmową dostawą
```

**Format `promo_history`:**
```json
[
  {
    "promo_name": "Walentynki 2024",
    "promo_type": ["procent"],
    "season": "Walentynki",
    "orders_count": 2,
    "best_signal": "promo_code",
    "free_shipping": true,
    "promo_code_used": "LOVE24"
  }
]
```

**Hierarchia sygnałów dopasowania promocji (best_signal):**

| Priorytet | Sygnał | Warunek |
|---|---|---|
| 1 | `promo_code` | `promo_code` lub `discount_code` z eventu pasuje do `code_name` promocji |
| 2 | `price_below_benchmark` | `price_at_purchase < avg_price z price_history * 0.99` (tolerancja 1%) |
| 3 | `free_shipping` | `shipping_cost = 0` i promocja ma `free_shipping = true` |
| 4 | `date_match` | Data zakupu mieści się w `start_date`–`end_date` promocji |

### 2.5 Tabela promotions (aktualny stan)

```sql
id, promo_name, promo_type (JSONB array), discount_type,
discount_min, discount_max,          -- zastąpiły discount_value (numeric(5,2))
category_list, product_list, requires_code, code_name, free_shipping,
start_date, end_date, season (JSONB array), notes

CONSTRAINT promotions_name_start_unique UNIQUE (promo_name, start_date)
```

**Zmiana (sesja 27.03.2026 wieczór):** kolumna `discount_value` zastąpiona przez `discount_min` i `discount_max` (typ `numeric(5,2)`) — pozwala przechowywać zakresy rabatów.

### 2.6 Materialized views (aktywne)

| View | Opis |
|---|---|
| `crm_overview` | Przegląd ogólny KPI |
| `crm_segments` | Statystyki per segment |
| `crm_risk` | Statystyki ryzyka |
| `crm_occasions` | Statystyki okazji |
| `crm_cohorts` | Analiza kohortowa |
| `crm_tag_stats` | Unnest tagów domenowych/granularnych/filarów/okazji z liczebnościami |
| `crm_predictive_ltv` | Predykcje LTV i zakupów |
| `crm_predictive_summary` | Podsumowanie predykcji |
| `crm_next_purchase_calendar` | Kalendarz przewidywanych zakupów |

**Odświeżanie:** funkcja `refresh_crm_views()` wywoływana przez Edge Function `recalculate-crm` o 10:00 UTC.

**Aktualna definicja `refresh_crm_views()`:**
```sql
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_overview;
  REFRESH MATERIALIZED VIEW crm_segments;
  REFRESH MATERIALIZED VIEW crm_risk;
  REFRESH MATERIALIZED VIEW crm_occasions;
  REFRESH MATERIALIZED VIEW crm_cohorts;
  REFRESH MATERIALIZED VIEW crm_tag_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usunięte views:** `crm_worlds`, `crm_segment_worlds` (usunięte — nie istniały po wcześniejszym czyszczeniu), `crm_segment_collectors`, `crm_segment_summary`

---

## 3. API Routes

### 3.1 Sync endpoints

| Endpoint | Metoda | Opis |
|---|---|---|
| `/api/sync/taxonomy` | POST | Sync taksonomii produktów z Google Sheets. Batch 100 rekordów (zmienione z 500). Sanityzacja znaków specjalnych. Walidacja `launch_date` (regex `YYYY-MM-DD`). |
| `/api/sync/promotions` | POST | Sync promocji. Upsert z `onConflict: 'promo_name,start_date'`, `ignoreDuplicates: true`. |
| `/api/sync/price-history` | POST | Sync historii cen produktów. |

**Auth:** `Authorization: Bearer <SYNC_SECRET>` (env var)
**Wspólna poprawka (27.03.2026):** wszystkie endpointy używają `NEXT_PUBLIC_SUPABASE_URL` (poprzednio błędnie `SUPABASE_URL`). Obsługa błędów `sync_log.insert` przez `try/catch` zamiast `.catch()`.

### 3.2 CRM endpoints

| Endpoint | Opis |
|---|---|
| `/api/crm/clients/list` | Lista klientów z filtrowaniem i paginacją |
| `/api/crm/clients/[id]` | Profil klienta: `clients_360` + `client_product_events` + `client_taxonomy_summary` + `crm_predictive_ltv` |
| `/api/crm/clients/export` | Eksport CSV klientów |
| `/api/crm/clients/export-edrone` | Eksport CSV dla edrone |
| `/api/crm/overview` | Statystyki ogólne CRM |
| `/api/crm/winback` | Lista klientów do winback |
| `/api/crm/pii` | Dane PII (email, imię) — wymaga sesji z uprawnieniami |
| `/api/crm/reveal` | Ujawnienie PII z logowaniem dostępu |
| `/api/crm/predictive` | Dane predykcyjne |
| `/api/crm/refresh-views` | Ręczne odświeżenie materialized views |
| `/api/cron/sync-orders` | Sync zamówień Shoper → Supabase (wywoływany przez Vercel cron 9:00 UTC) |

**Poprawka (27.03.2026):** kolumna `occasion` usunięta z selecta w `/api/crm/clients/[id]/route.js` (nie istnieje w `client_product_events`).

---

## 4. Scripts / narzędzia

### 4.1 scripts/recalculate-taxonomy.js

Przelicza `client_taxonomy_summary` dla wszystkich klientów bezpośrednio z `client_product_events JOIN products`.

**Co zapisuje:**
- Wszystkie tagi bez limitu (poprzednio top-N)
- `tags_granularne_counts`, `tags_domenowe_counts`, `filary_marki_counts`, `okazje_counts` — JSONB z licznikami
- `top_segments` — array `[{segment, count}]`
- `seasons_counts`, `product_groups_counts` — JSONB z licznikami
- `new_products_ratio`, `evergreen_count`, `promo_count`, `total_events`
- `promo_history`, `promo_seasons`, `free_shipping_orders` — matchowanie z tabelą `promotions`

**Uruchomienie:**
```bash
node scripts/recalculate-taxonomy.js
```

**Czas wykonania:** ~kilka minut (106k klientów).

### 4.2 Inne skrypty w scripts/

| Skrypt | Opis |
|---|---|
| `shoper-full-import.js` | Pełny import danych z Shoper API — pobiera `promo_code`, `discount_code`, `discount_client`, `shipping_cost` |
| `shoper-historical-import.js` | Import historyczny zamówień |
| `backfill-emails.js` | Uzupełnianie emaili w PII |
| `shoper-pii-backfill.js` | Backfill danych PII ze Shoper |
| `clean-db.js` | Narzędzie do czyszczenia danych |
| `export-backup.js` | Eksport backupu bazy |

### 4.3 lib/crm/etl.js

Warstwa ETL używana przez `shoper-full-import.js` i sync orders. Zaktualizowana (sesja 27.03.2026 wieczór) o obsługę nowych pól z Shoper API:
- `promo_code` — kod promocyjny z zamówienia
- `discount_code` — kod rabatowy
- `discount_client` — rabat per klient
- `shipping_cost` — koszt dostawy (identyczny dla wszystkich line itemów z tego samego `order_id`)

---

## 5. Edge Functions (Supabase)

### 5.1 recalculate-crm

| Właściwość | Wartość |
|---|---|
| URL | `https://dayrmhsdpcgakbsfjkyp.supabase.co/functions/v1/recalculate-crm` |
| Auth | `Bearer nadwyraz_cron_sync_2026` |
| Flagi | `--no-verify-jwt` |
| Trigger | pg_cron: `recalculate-crm-daily`, schedule `0 10 * * *` |

**Wykonuje:**
1. `recalculate_all_ltv()` — przeliczenie LTV wszystkich klientów
2. `refresh_crm_views()` — odświeżenie materialized views (6 views: overview, segments, risk, occasions, cohorts, tag_stats)

---

## 6. Google Apps Script

Triggery: `syncTaxonomy`, `syncPromotions`, `syncPriceHistory`

**Poprawki (sesja 27.03.2026):**
- Usunięte wywołania `SpreadsheetApp.getUi().alert()` z triggerów — powodowały błędy przy uruchamianiu bez aktywnego arkusza (zastąpione `Logger.log`)
- `syncPromotions`: funkcja `parseDiscount` obsługuje teraz zarówno liczby (`15`) jak i stringi z procentem (`"15%"`) — mapuje na `discount_min` i `discount_max`

**Batch taxonomy sync:** zmieniony z 500 → 100 rekordów na żądanie (stabilność).

---

## 7. Frontend CRM

### 7.1 Dostępne zakładki

| Ścieżka | Opis |
|---|---|
| `/crm` | Dashboard — przegląd KPI |
| `/crm/clients` | Lista klientów z filtrowaniem |
| `/crm/clients/[id]` | Profil klienta (rozbudowany) |
| `/crm/winback` | Lista klientów do winback |
| `/crm/analytics` | Analityka ogólna |
| `/crm/analytics/worlds` | Analityka według światów (legacy, do usunięcia) |
| `/crm/import` | Import i zarządzanie danymi |

**Usunięte zakładki:** Zachowania, Analityka okazji, Kohorty, Segmentacja zaawansowana, AI Insights, Braki w taksonomii, Matryca cen, Audit danych

### 7.2 Profil klienta /crm/clients/[id]

**Lewa kolumna:**
- Oś czasu zamówień (timeline z grupowaniem po order_id)
- Mapa produktów (grid unikalnych produktów z licznikiem zakupów)

**Prawa kolumna:**
- Hero KPIs: LTV, liczba zamówień, pierwszy/ostatni zakup, top domena
- Dane osobowe (PII — za przyciskiem odblokowania)
- Szybkie akcje (eksport edrone, rekomendacje AI, winback AI, kopiuj ID)
- Predykcja zakupu (prawdopodobieństwo 30d, LTV 12M, rytm)
- Wskaźniki zachowania (promo%, sezon, dzień tygodnia, śr. koszyk)
- **Profil zainteresowań** (3 bloki):

**Blok 1 — DNA zakupowe:**
- Tagi granularne z licznikami (top 5 + rozwiń)
- Domeny z licznikami (top 5 + rozwiń)
- Okazje z licznikami (top 5 + rozwiń)
- Filary marki z licznikami (jeśli niepuste)

**Blok 2 — Wzorce zakupowe:**
- Segmenty prezentowe (top 3 + rozwiń) — format `[{segment, count}]`
- Pory roku z ikonami i kolorami (seasons_counts)
- Kategorie produktowe (top 5 + rozwiń)
- Nowości vs evergreen — pasek z `new_products_ratio`
- Promo vs full price — pasek z `promo_count / total_events`

**Blok 3 — Statystyki:**
- `total_events` — Łącznie pozycji zakupowych
- `evergreen_count` — Produkty ponadczasowe
- `promo_count` — Zakupy w promocji

**Blok 4 — Historia promocji (napisany prompt, do wdrożenia):**
- Lista promocji z `promo_history`: nazwa, typ, sezon, liczba zamówień, sygnał dopasowania, darmowa dostawa
- Wskaźnik `free_shipping_orders` i liste sezonów z `promo_seasons`

---

## 8. Stan bazy danych (27.03.2026)

| Metryka | Wartość |
|---|---|
| Klientów | 150 906 |
| Eventów zakupowych | 476 738 |
| LTV całkowite | 27,1 mln zł |
| Klientów z taksonomią | 106 036 |
| Rekordów w promotions | 151 (lata 2022–2026) |

---

## 9. Zmienne środowiskowe

| Zmienna | Użycie |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (wszystkie endpointy) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klucz publiczny Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz service role (operacje server-side) |
| `SYNC_SECRET` | Token autoryzacji dla endpointów `/api/sync/*` |
| `ANTHROPIC_API_KEY` | Klucz API Claude (AI features) |

---

## 10. Backlog (do zrobienia)

| Priorytet | Zadanie |
|---|---|
| P1 | RLS na tabelach Supabase |
| P1 | Dodanie `recalculate-taxonomy.js` do automatycznego pipeline (po `sync-orders`) |
| P2 | UI blok "Historia promocji" w profilu klienta (prompt napisany, gotowy do wdrożenia) |
| P2 | Analityka grupowa — zachowania per segment/domena/tag z filtrowaniem dat |
| P3 | Redukcja unmapped products (~27% klientów bez taksonomii) |
| P3 | Testy automatyczne |
| P3 | Usunięcie lub aktualizacja zakładki `/crm/analytics/worlds` (legacy) |

---

## 11. Historia zmian

| Wersja | Data | Opis |
|---|---|---|
| v5 | 27.03.2026 (wieczór) | Matchowanie promocji z profilem klienta: nowe kolumny w `client_product_events` (promo_code, discount_code, discount_client, shipping_cost), nowe kolumny w `client_taxonomy_summary` (promo_history, promo_seasons, free_shipping_orders), hierarchia sygnałów, price_below_benchmark. Tabela promotions: discount_value → discount_min/discount_max. ETL zaktualizowany. refresh_crm_views() naprawiona (usunięto crm_worlds, crm_segment_worlds). Apps Script syncPromotions naprawiony. |
| v4 | 27.03.2026 (rano) | Rozbudowa profilu klienta, recalculate-taxonomy, crm_tag_stats, top_domena, naprawa sync endpointów, upsert promotions, cleanup legacy |
| v3 | — | (poprzednia wersja — brak pliku w repo) |
