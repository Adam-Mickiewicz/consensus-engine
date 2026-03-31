# Projekt CRM — Dokumentacja techniczna v7
**Data aktualizacji:** 31.03.2026
**Repozytorium:** github.com/Adam-Mickiewicz/consensus-engine
**Stos:** Next.js 15 (App Router) · Supabase (Postgres + Edge Functions + pg_cron) · Vercel Pro · Google Apps Script

---

## 1. Architektura systemu

### 1.1 Warstwy

```
Google Sheets (źródło danych)
    ↓ Apps Script triggers (co 30 min lub raz dziennie)
Vercel API Routes /api/sync/*
    ↓ upsert
Supabase Postgres
    ↓ Vercel cron 9:00 UTC
Edge Function: (brak — sync-orders to Vercel Function)
    → fast insert (master_key → clients_360 → client_product_events)
    ↓ pg_cron 10:00 UTC
Edge Function: recalculate-crm
    → recalculate_all_ltv()
    → refresh_crm_views()
    → POST /api/admin/recalculate-taxonomy (fire & forget)
    ↓
Next.js CRM frontend (/crm/*)
```

### 1.2 Automatyczny pipeline

| Czas (UTC) | Trigger | Akcja |
|---|---|---|
| 09:00 | Vercel cron | `GET /api/cron/sync-orders` — fast insert zamówień z Shoper. Kolejność: `master_key` → `clients_360` → `client_product_events`. Zapisuje do `sync_log` (source: `sync_orders` + `cron_sync`). |
| 10:00 | pg_cron: `recalculate-crm-daily` | Edge Function `recalculate-crm` → `recalculate_all_ltv()` + `refresh_crm_views()` + `/api/admin/recalculate-taxonomy` (fire & forget, do 300s) |
| co 30 min | Apps Script trigger czasowy | `syncTaxonomy` — sync taksonomii (Sheets → `products`) |
| co 30 min | Apps Script trigger czasowy | `syncPromotions` — sync promocji (Sheets → `promotions`) |
| 06:00 UTC | Apps Script trigger czasowy | `syncPriceHistory` — raz dziennie (Sheets → `price_history`) |

**Uwaga:** Apps Script synchronizuje dane wejściowe. Przeliczenie `client_taxonomy_summary` następuje automatycznie o 10:00 przez `/api/admin/recalculate-taxonomy`.

---

## 2. Infrastruktura

### 2.1 Vercel Pro

- Plan: **Vercel Pro** ($20/mies.)
- Limit funkcji: **800 sekund** (`maxDuration`)
- `maxDuration` ustawiany w dwóch miejscach: `route.js` (eksport `export const maxDuration = N`) **oraz** `vercel.json` (klucz `functions`)

### 2.2 Middleware

Plik `middleware.js` blokuje dostęp do aplikacji bez aktywnej sesji Supabase — redirect na `/login`.

**Wyjątki (publiczne ścieżki):**
- `/login`
- `/auth/callback`
- `/api/auth/*`
- `/api/cron/*`
- `/api/sync/*`

Wszystkie pozostałe ścieżki (w tym `/crm/*`, `/admin/*`) wymagają zalogowania.

---

## 3. Baza danych

### 3.1 Kluczowe tabele

| Tabela | Opis | Rozmiar (27.03.2026) |
|---|---|---|
| `clients_360` | Profil klienta: segment, LTV, ryzyko, daty, top_domena | 150 906 klientów |
| `client_product_events` | Zdarzenia zakupowe (EAN, produkt, data, sezon, promo, koszty dostawy) | 476 738 eventów |
| `client_taxonomy_summary` | Tagi, liczniki, wzorce zakupowe, historia promocji per klient | 106 036 klientów z tagami |
| `products` | Katalog produktów z tagami domenowymi/granularnymi/filarami/okazjami | — |
| `promotions` | Promocje z datami, typami, rabatami (min/max) | 151 rekordów (2022–2026) |
| `master_key` | Mapowanie email_hash → client_id + zaszyfrowany email (AES-256-GCM) | — |
| `exclusions` | Emaile wykluczone z CRM (np. pracownicy) | — |
| `crm_predictive_ltv` | Predykcje: LTV 12M, prawdopodobieństwo zakupu 30d, rytm | — |
| `sync_log` | Log wszystkich operacji sync | — |

### 3.2 Kolumny clients_360 (aktualny stan)

```sql
client_id, legacy_segment, risk_level, ltv, orders_count,
first_order, last_order, top_domena,
winback_priority, updated_at
```

**Usunięte (legacy, sesja 30.03.2026):**
`ulubiony_swiat`, `worlds_list`, `events_list`, `purchase_frequency_yearly`, `full_order_history`

**Normalizacja `top_domena`:** wartość zapisywana w formacie `INITCAP` (np. `Zdrowie`, `Dom`, `Uroda`).

### 3.3 Kolumny client_product_events (aktualny stan)

```sql
-- Pierwotne
client_id, order_id, ean, product_name, price_at_purchase,
quantity, line_total, order_date, season, promo_flag

-- Dodane (sesja 27.03.2026 wieczór)
promo_code        -- TEXT: kod promocyjny użyty przy zamówieniu (z Shoper API)
discount_code     -- NUMERIC: kod/wartość rabatowy
discount_client   -- NUMERIC: rabat per klient
shipping_cost     -- NUMERIC: koszt dostawy dla zamówienia
```

**Usunięte ograniczenia:**
- `client_product_events_ean_fkey` — FK na tabelę `products` usunięty (sesja 30.03.2026); EAN nieznany w katalogu nie blokuje już insertu.

**Uwaga dot. `shipping_cost`:**
- Dla danych historycznych (przed integracją API) obliczany jako: `order_sum - SUM(line_total) per order_id`
- Zakres walidowany: 0–30 zł (wartości poza zakresem ustawiane na NULL)
- Ta sama wartość `shipping_cost` zapisywana dla wszystkich pozycji (line itemów) z tego samego `order_id`

### 3.4 Kolumny client_taxonomy_summary (aktualny stan)

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
promo_seasons            -- TEXT[]: tablica seasonów, w których klient kupował w promocji
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
    "signal": "promo_code",
    "free_shipping": true,
    "promo_code_used": "LOVE24"
  }
]
```

**Hierarchia sygnałów dopasowania promocji:**

| Priorytet | Sygnał | Warunek |
|---|---|---|
| 1 | `promo_code` | `promo_code` lub `discount_code` z eventu pasuje do `code_name` promocji |
| 2 | `price_below_benchmark` | `price_at_purchase < avg_price z price_history * 0.99` (tolerancja 1%) |
| 3 | `free_shipping` | `shipping_cost = 0` i promocja ma `free_shipping = true` |
| 4 | `date_match` | Data zakupu mieści się w `start_date`–`end_date` promocji |

### 3.5 Tabela promotions (aktualny stan)

```sql
id, promo_name, promo_type (JSONB array), discount_type,
discount_min, discount_max,          -- zastąpiły discount_value (numeric(5,2))
category_list, product_list, requires_code, code_name, free_shipping,
start_date, end_date, season (JSONB array), notes

CONSTRAINT promotions_name_start_unique UNIQUE (promo_name, start_date)
```

**Zmiana (sesja 27.03.2026 wieczór):** kolumna `discount_value` zastąpiona przez `discount_min` i `discount_max` (typ `numeric(5,2)`).

### 3.6 Tabela sync_log

Loguje wszystkie operacje synchronizacji i przeliczania.

**Dozwolone wartości kolumny `source` (constraint naprawiony sesja 31.03.2026):**

| Wartość | Opis |
|---|---|
| `sync_orders` | Wstawianie zamówień przez `/api/cron/sync-orders` |
| `cron_sync` | Dodatkowy log z cron sync-orders |
| `recalculate_taxonomy` | Przeliczanie `client_taxonomy_summary` przez `/api/admin/recalculate-taxonomy` |
| (poprzednie) | `sync_taxonomy`, `sync_promotions`, `sync_price_history`, inne wartości Apps Script |

**Uwaga:** RLS na `sync_log` tymczasowo wyłączone — do włączenia po naprawie polityk.

### 3.7 Materialized views (aktywne)

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
| `crm_behavior_segments` | Analityka behawioralna: zakupy per segment (nowe, sesja 31.03.2026) |
| `crm_behavior_seasons` | Analityka behawioralna: wzorce sezonowe (nowe, sesja 31.03.2026) |
| `crm_behavior_promos` | Analityka behawioralna: skuteczność promocji (nowe, sesja 31.03.2026) |
| `crm_behavior_product_groups` | Analityka behawioralna: grupy produktowe (nowe, sesja 31.03.2026) |

**Odświeżanie:** funkcja `refresh_crm_views()` wywoływana przez Edge Function `recalculate-crm` o 10:00 UTC.

**Aktualna definicja `refresh_crm_views()` (zaktualizowana sesja 31.03.2026):**
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
  REFRESH MATERIALIZED VIEW crm_behavior_segments;
  REFRESH MATERIALIZED VIEW crm_behavior_seasons;
  REFRESH MATERIALIZED VIEW crm_behavior_promos;
  REFRESH MATERIALIZED VIEW crm_behavior_product_groups;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usunięte views:** `crm_worlds`, `crm_segment_worlds`, `crm_segment_collectors`, `crm_segment_summary`

---

## 4. API Routes

### 4.1 Sync endpoints

| Endpoint | Metoda | Opis |
|---|---|---|
| `/api/sync/taxonomy` | POST | Sync taksonomii produktów z Google Sheets. Batch 100 rekordów. Sanityzacja znaków specjalnych. Walidacja `launch_date`. |
| `/api/sync/promotions` | POST | Sync promocji. Upsert z `onConflict: 'promo_name,start_date'`, `ignoreDuplicates: true`. |
| `/api/sync/price-history` | POST | Sync historii cen produktów. |

**Auth:** `Authorization: Bearer <SYNC_SECRET>`

### 4.2 Cron endpoints

| Endpoint | Metoda | Opis |
|---|---|---|
| `/api/cron/sync-orders` | GET | Fast insert zamówień z ostatnich 2 dni (Shoper API → master_key + clients_360 + client_product_events). Bez ETL. `maxDuration: 800`. Auth: `Bearer CRON_SECRET`. |

**Działanie `sync-orders` (fast insert — kolejność krytyczna ze względu na FK):**
1. Pobierz zamówienia z Shopera z cutoff 2 dni (binary search po stronach)
2. Oblicz `client_id = "NZ-" + MD5(email).substring(0,10).toUpperCase()`
3. Upsert `master_key` — tylko nowi klienci (`ignoreDuplicates: true`)
4. Upsert `clients_360` — merge z istniejącymi danymi (min `first_order`, max `last_order`, `orders_count +=`, `ltv +=`)
5. Upsert `client_product_events` — `onConflict: order_id,ean,product_name`, `ignoreDuplicates: true`
6. Zapis do `sync_log` (source: `sync_orders` oraz `cron_sync`)
7. Zwróć wynik z liczbą klientów i eventów

**Uwaga o kolejności:** `master_key` musi być przed `clients_360` (FK), `clients_360` musi być przed `client_product_events` (FK). `client_product_events_ean_fkey` usunięty — EAN nieznany w katalogu nie blokuje insertu.

### 4.3 Admin endpoints

| Endpoint | Metoda | Opis |
|---|---|---|
| `/api/admin/recalculate-taxonomy` | POST | Fire & forget job przeliczający `client_taxonomy_summary`. Zwraca `{ok: true, started: true}` natychmiast. `maxDuration: 300`. Auth: `Bearer CRON_SECRET`. Loguje wynik do `sync_log` (source: `recalculate_taxonomy`). |

### 4.4 CRM endpoints

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
| `/api/crm/behavior` | Dane analityki behawioralnej z `crm_behavior_*` views |
| `/api/crm/import/unmapped` | Lista produktów bez taksonomii z paginacją i filtrowaniem |

---

## 5. Frontend CRM

### 5.1 Dostępne zakładki

| Ścieżka | Opis |
|---|---|
| `/crm` | Dashboard — przegląd KPI |
| `/crm/clients` | Lista klientów z filtrowaniem |
| `/crm/clients/[id]` | Profil klienta (rozbudowany) |
| `/crm/winback` | Lista klientów do winback |
| `/crm/analytics` | **World-class dashboard** (redesign sesja 31.03.2026) |
| `/crm/analytics/behavior` | **Analityka behawioralna** — 4 zakładki (nowe, sesja 31.03.2026) |
| `/crm/import` | Import i zarządzanie danymi |
| `/crm/import/unmapped` | **Braki w taksonomii** — produkty bez przypisania (nowe, sesja 31.03.2026) |

### 5.2 /crm/analytics — world-class dashboard (redesign 31.03.2026)

**5 hero metrics (górna belka):**
- Aktywni klienci (ostatnie 90 dni)
- Całkowite LTV
- Średnia wartość zamówienia
- Klienci VIP (Diamond + Gold)
- Klienci wysokiego ryzyka (churn)

**Sekcje:**
- **Wykres przychodów** — trend miesięczny z porównaniem rok do roku
- **Segmenty klikalne** — kliknięcie przechodzi do przefiltrowanej listy `/crm/clients`
- **Alerty VIP** — klienci Diamond bez zakupu >60 dni
- **Live feed zamówień** — ostatnie 10 zamówień (real-time)
- **Top Diamond** — top 10 klientów Diamond wg LTV
- **Risk levels klikalne** — kliknięcie risk level filtruje listę klientów
- **Top domeny klikalne** — kliknięcie domeny filtruje listę klientów

### 5.3 /crm/analytics/behavior — analityka behawioralna (nowe, 31.03.2026)

**4 zakładki:**

| Zakładka | Opis | Źródło danych |
|---|---|---|
| **Segmentacja** | Porównanie zachowań Grupa A vs Grupa B — LTV, zamówienia, promo%, sezon | `crm_behavior_segments` |
| **DNA zakupowe** | Top tagi granularne, domeny, filary marki z rozkładem procentowym | `crm_tag_stats` |
| **Promocje** | Skuteczność promocji — współczynnik konwersji, AOV promo vs full price, top kody | `crm_behavior_promos` |
| **Sezonowość** | Rozkład zamówień per sezon, wzorce roczne, top sezony per segment | `crm_behavior_seasons` |

**Porównanie Grupa A vs B:** każda zakładka pokazuje zestawienie dwóch segmentów wybranych przez użytkownika z dropdownu.

### 5.4 /crm/import/unmapped — braki w taksonomii (nowe, 31.03.2026)

Widok produktów bez przypisanej taksonomii (EAN w `client_product_events` ale brak w `products` lub brak tagów).

**Funkcjonalności:**
- Wyszukiwanie po nazwie produktu lub EAN
- Sortowanie po liczbie klientów bez taksonomii / wartości zamówień
- Paginacja (50 rekordów na stronę)
- Status: `name_match` — czy istnieje produkt o podobnej nazwie (fuzzy match)
- Eksport CSV — lista produktów do uzupełnienia w Sheets

### 5.5 Profil klienta /crm/clients/[id]

**Lewa kolumna:**
- Oś czasu zamówień (timeline z grupowaniem po order_id)
- Mapa produktów (grid unikalnych produktów z licznikiem zakupów)

**Prawa kolumna:**
- Hero KPIs: LTV, liczba zamówień, pierwszy/ostatni zakup, top domena
- Dane osobowe (PII — za przyciskiem odblokowania)
- Szybkie akcje (eksport edrone, rekomendacje AI, winback AI, kopiuj ID)
- Predykcja zakupu (prawdopodobieństwo 30d, LTV 12M, rytm)
- Wskaźniki zachowania (promo%, sezon, dzień tygodnia, śr. koszyk)

**Blok 1 — DNA zakupowe:** tagi granularne, domeny, okazje, filary marki (top 5 + rozwiń, z licznikami)

**Blok 2 — Wzorce zakupowe:** segmenty prezentowe, pory roku, kategorie produktowe, nowości vs evergreen, promo vs full price

**Blok 3 — Statystyki:** total_events, evergreen_count, promo_count

**Blok 4 — Historia promocji (DO WDROŻENIA):** lista z `promo_history`, wskaźnik `free_shipping_orders`, sezony z `promo_seasons`

---

## 6. Scripts / narzędzia

### 6.1 scripts/recalculate-taxonomy.js

Przelicza `client_taxonomy_summary` dla wszystkich klientów bezpośrednio z `client_product_events JOIN products`. Używany do ręcznego uruchomienia; w automatycznym pipeline zastąpiony przez `/api/admin/recalculate-taxonomy`.

**Co zapisuje:**
- Wszystkie tagi bez limitu (poprzednio top-N)
- `tags_granularne_counts`, `tags_domenowe_counts`, `filary_marki_counts`, `okazje_counts` — JSONB z licznikami
- `top_segments` — array `[{segment, count}]`
- `seasons_counts`, `product_groups_counts` — JSONB z licznikami
- `new_products_ratio`, `evergreen_count`, `promo_count`, `total_events`
- `promo_history`, `promo_seasons`, `free_shipping_orders` — matchowanie z tabelą `promotions`

**Normalizacja (sesja 31.03.2026):**
- `top_domena`: zapisywana jako `INITCAP` (np. `Zdrowie`, nie `ZDROWIE`)
- Sezony: wewnętrznie `SNAKE_CASE` → wyświetlane jako polskie nazwy (np. `back_to_school` → `Powrót do szkoły`)

**Naprawa `product_groups_counts` (sesja 31.03.2026):**
- Błąd: `product_group` nie był includzony w SELECT przy `loadProducts()` — wszystkie klienty miały pustą mapę
- Fix: dodano `product_group` do zapytania SELECT w funkcji `loadProducts`

**Uruchomienie ręczne:**
```bash
node scripts/recalculate-taxonomy.js
```

**Czas wykonania:** ~kilka minut (106k klientów).

### 6.2 Inne skrypty w scripts/

| Skrypt | Opis |
|---|---|
| `shoper-full-import.js` | Pełny import danych z Shoper API |
| `shoper-historical-import.js` | Import historyczny zamówień |
| `backfill-emails.js` | Uzupełnianie emaili w PII |
| `shoper-pii-backfill.js` | Backfill danych PII ze Shoper |
| `clean-db.js` | Narzędzie do czyszczenia danych |
| `export-backup.js` | Eksport backupu bazy |

### 6.3 lib/crm/etl.js

Warstwa ETL używana przez `shoper-full-import.js` (nie przez `sync-orders` — ten ma własny fast insert).

**Usunięte pola (sesja 30.03.2026):**
- `events_list`, `worlds_list`, `ulubiony_swiat`, `purchase_frequency_yearly`, `full_order_history` — usunięte z `buildProfiles()` i upsert do `clients_360`

---

## 7. Edge Functions (Supabase)

### 7.1 recalculate-crm

| Właściwość | Wartość |
|---|---|
| URL | `https://dayrmhsdpcgakbsfjkyp.supabase.co/functions/v1/recalculate-crm` |
| Auth | `Bearer CRON_SECRET` |
| Flagi | `--no-verify-jwt` |
| Trigger | pg_cron: `recalculate-crm-daily`, schedule `0 10 * * *` |

**Wykonuje (zaktualizowane sesja 30–31.03.2026):**
1. `recalculate_all_ltv()` — przeliczenie LTV wszystkich klientów
2. `refresh_crm_views()` — odświeżenie 10 materialized views (w tym 4 nowe `crm_behavior_*`)
3. `POST /api/admin/recalculate-taxonomy` — fire & forget (nie czeka na odpowiedź)

---

## 8. Google Apps Script

### 8.1 Triggery automatyczne

| Funkcja | Częstotliwość | Cel |
|---|---|---|
| `syncTaxonomy` | Co 30 minut | Sheets → `products` (taksonomia produktów) |
| `syncPromotions` | Co 30 minut | Sheets → `promotions` |
| `syncPriceHistory` | Raz dziennie 06:00 | Sheets → `price_history` |

**Uwaga (backlog):** Usunąć błędny trigger czasowy `onOpen` — zamiast triggera zdarzeniowego (onOpen) istnieje niepotrzebny trigger czasowy.

### 8.2 Poprawki historyczne

| Sesja | Zmiana |
|---|---|
| 27.03.2026 | Usunięte wywołania `SpreadsheetApp.getUi().alert()` — zastąpione `Logger.log` |
| 27.03.2026 | `syncPromotions`: `parseDiscount` obsługuje liczby i stringy z procentem → mapuje na `discount_min` i `discount_max` |
| 27.03.2026 | Batch taxonomy sync: 500 → 100 rekordów na żądanie |

---

## 9. Stan bazy danych (27.03.2026)

| Metryka | Wartość |
|---|---|
| Klientów | 150 906 |
| Eventów zakupowych | 476 738 |
| LTV całkowite | 27,1 mln zł |
| Klientów z taksonomią | 106 036 |
| Klientów bez taksonomii | ~27% (~40 000) |
| Rekordów w promotions | 151 (lata 2022–2026) |

---

## 10. Zmienne środowiskowe

| Zmienna | Użycie |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase (wszystkie endpointy) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klucz publiczny Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz service role (operacje server-side) |
| `CRON_SECRET` | Token autoryzacji dla `/api/cron/*` i `/api/admin/recalculate-taxonomy` |
| `SYNC_SECRET` | Token autoryzacji dla endpointów `/api/sync/*` |
| `ENCRYPTION_KEY` | 64-char hex (32 bajty) — AES-256-GCM szyfrowanie PII |
| `ANTHROPIC_API_KEY` | Klucz API Claude (AI features) |

---

## 11. Backlog

| Priorytet | Zadanie | Status |
|---|---|---|
| P1 | Uprawnienia użytkowników — `/admin/users` togglei nie zapisują | Fix gotowy, czeka na test |
| P1 | Weryfikacja `recalculate_taxonomy` w automatycznym pipeline | Sprawdzić `sync_log` po 10:00 UTC |
| P1 | Historia promocji w profilu klienta — UI blok | Prompt gotowy, dane dostępne w `promo_history` |
| P2 | RLS na `sync_log` — włączyć z powrotem | Po naprawie polityk RLS |
| P2 | `onOpen` trigger w Apps Script — usunąć błędny trigger czasowy | Skonfigurować jako trigger zdarzeniowy |
| P3 | Redukcja unmapped products (~27% klientów bez taksonomii) | Widok `/crm/import/unmapped` gotowy |
| P3 | Usunięcie zakładki `/crm/analytics/worlds` (legacy) | — |

---

## 12. Historia zmian

| Wersja | Data | Opis |
|---|---|---|
| v7 | 31.03.2026 | Vercel Pro (800s limit, maxDuration w route.js + vercel.json). Nowe materialized views: `crm_behavior_segments`, `crm_behavior_seasons`, `crm_behavior_promos`, `crm_behavior_product_groups`. `refresh_crm_views()` zaktualizowana. sync-orders: kolejność insert master_key→clients_360→client_product_events udokumentowana. sync_log source check naprawiony (dodano `sync_orders`, `cron_sync`, `recalculate_taxonomy`). Normalizacja: `top_domena` INITCAP, sezony SNAKE_CASE→polskie nazwy. `product_groups_counts` naprawiony (brakujące `product_group` w SELECT). CRM UI redesign: `/crm/analytics` world-class dashboard (5 hero metrics, wykres, segmenty/risk/domeny klikalne, alerty VIP, live feed, top Diamond). Nowe strony: `/crm/analytics/behavior` (4 zakładki, porównanie A vs B), `/crm/import/unmapped` (search, sort, paginacja, name match, CSV export). |
| v6 | 30.03.2026 | Middleware auth (blokada niezalogowanych). sync-orders przeprojektowany na fast insert (maxDuration 60s, ~15s dla 100+ zamówień, bez ETL). Nowy endpoint `/api/admin/recalculate-taxonomy` (fire & forget, 300s). Edge Function recalculate-crm rozszerzona o wywołanie taxonomy. ETL legacy cleanup: usunięto 5 pól z etl.js i clients_360. Usunięto FK `client_product_events_ean_fkey`. |
| v5 | 27.03.2026 (wieczór) | Matchowanie promocji: nowe kolumny w `client_product_events` i `client_taxonomy_summary`, hierarchia sygnałów. `promotions`: discount_value → discount_min/discount_max. `refresh_crm_views()` naprawiona. Apps Script syncPromotions naprawiony. |
| v4 | 27.03.2026 (rano) | Rozbudowa profilu klienta, recalculate-taxonomy, crm_tag_stats, top_domena, naprawa sync endpointów, upsert promotions, cleanup legacy. |
| v3 | — | (poprzednia wersja — brak pliku w repo) |
