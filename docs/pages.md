# Strony CRM

Wszystkie strony w `app/(dashboard)/crm/`. Technologia: TypeScript, `'use client'`, inline styles, IBM Plex Mono. Data fetching przez `useEffect` + `fetch`.

---

## Executive Dashboard (`/crm/analytics`)

**Plik**: `app/(dashboard)/crm/analytics/page.tsx` (486 linii)  
**API**: `/api/crm/dashboard`, `/api/crm/dashboard-config`, `/api/crm/analytics/recent-orders`, `/api/crm/analytics/revenue-trend`, `/api/crm/analytics/top-diamonds`

### Funkcje

**Toggle widoku**
- **Ogólny** — stały zestaw widgetów (pełny dashboard)
- **Mój dashboard** — spersonalizowany, konfigurowalny zestaw widgetów; konfiguracja zapisywana do `user_dashboard_config` w Supabase

**Date Range Picker** (`components/DateRangePicker.tsx`)
- Presety: 30d / 90d / 180d / YTD / 12m / Cała historia / Zakres własny
- Zmiana zakresu wywołuje `/api/crm/dashboard?date_from=...&date_to=...`

**Dostępne widgety (14)**

| ID widgetu | Nazwa | Opis |
|---|---|---|
| `kpi_row` | KPI Row | 8 kluczowych wskaźników w rzędzie |
| `matrix` | Value × Risk Matrix | Heatmapa segment × risk (klikalny → lista klientów) |
| `revenue` | Revenue Trend | Chart.js stacked bar (repeat + new, ostatnie 24m) |
| `opportunity` | Opportunity Cards | 4 karty z actionable segmentami |
| `funnel` | Lifecycle Funnel | Poziome bary z konwersją między etapami |
| `worlds` | Worlds Performance | Tabela świat/domena z progress barami |
| `alert_center` | Alert Center | Dynamiczne alerty na podstawie danych KPI |
| `cohort_mini` | Cohort Mini | Miniaturka heatmapy retencji |
| `promo_dependency` | Promo Dependency | Rozkład uzależnienia od promocji |
| `time_to_second` | Time to 2nd Order | Rozkład czasu do drugiego zamówienia |
| `repeat_ladder` | Repeat Ladder | Drabina zamówień (1, 2, 3+ zamówień) |
| `top_products` | Top Products | Ranking produktów |
| `season_calendar` | Season Calendar | Kalendarz sezonów i okazji |
| `segment_migration` | Segment Migration | Macierz przejść między segmentami |
| `traffic_pulse` | Traffic Pulse | Mini-wskaźnik ruchu GA4 |
| `recent_orders` | Recent Orders | Ostatnie zamówienia (live feed) |
| `top_diamonds` | Top Diamonds | Top 10 klientów Diamond |

**KPI Row (8 wskaźników)**
- Active 90d — klienci aktywni w ciągu 90 dni
- Repeat rate — % klientów z >1 zamówieniem
- Repeat revenue — przychód od powracających
- At-risk revenue — LTV zagrożonych klientów (Risk + HighRisk)
- Winback VIP — liczba Diamond/Platinum w stanie Lost/HighRisk
- 2nd order candidates — klienci z 1 zamówieniem, aktywni 30–90 dni temu
- Promo share — % zakupów w promocji
- Nowości share — % zakupów produktów nowościowych

---

## Lista klientów (`/crm/clients`)

**Plik**: `app/(dashboard)/crm/clients/page.tsx` (12 linii — redirect/shell)  
**API**: `/api/crm/clients/list`, `/api/crm/clients/export`, `/api/crm/clients/export-edrone`

### Funkcje
- Tabela z paginacją (50/strona)
- **Filtry**: Segment, Risk Level, Świat, zakres LTV, zakres dat last_order, RFM segment, lead temperature, gift label, wyszukiwanie po client_id
- **Sortowanie**: LTV desc (domyślne), LTV asc, Last Order desc/asc, Orders desc/asc, First Order desc
- **Eksport CSV** — do 10 000 rekordów
- **Eksport edrone** — z tagami CRM, wymaga odczytu emaili z master_key

---

## Profil klienta 360° (`/crm/clients/[id]`)

**Plik**: `app/(dashboard)/crm/clients/[id]/page.tsx`  
**API**: `/api/crm/clients/[id]`, `/api/crm/clients/[id]/notes`, `/api/crm/ai-insights/recommendations`, `/api/crm/ai-insights/winback`

### Sekcje profilu

**Header z badges**
- Segment badge (Diamond/Platinum/Gold/Returning/New) z kolorem
- Risk badge (OK/Risk/HighRisk/Lost)
- RFM segment badge
- Lead temperature badge (Hot/Warm/Cool/Cold)
- Gift label badge

**Barometr klienta**
- Wskaźnik `customer_health_score` (0–100)

**Metryki główne**
- LTV, liczba zamówień, średnia wartość zamówienia
- Data pierwszego i ostatniego zakupu
- Przewidywana data następnego zakupu
- Prawdopodobieństwo zakupu w 30 dni (%)

**Gift Analysis**
- `gift_score` (0–100) z progress barem
- `gift_label` — klasyfikacja preferencji prezentowych

**Lead Score**
- `lead_score` (0–100)
- `lead_temperature` (Hot/Warm/Cool/Cold)

**Customer DNA**
- Tagi granularne z liczbą zakupów
- Tagi domenowe (światy)
- Filary marki
- Okazje zakupów

**Segmenty prezentowe**
- Dominujące kategorie prezentowe

**Sezonowość z przychodem**
- Tabela sezonów z przychodem i liczbą zakupów

**Occasion Retention**
- Które okazje utrzymują klienta

**Timeline zakupów**
- Chronologiczna lista eventów z `client_product_events`
- Kolumny: data, produkt, EAN, wartość, sezon, is_promo

**Adnotacje (CRUD)**
- Lista notatek do klienta
- Formularz dodawania (note, tags, note_type)
- Możliwość usuwania notatek

**AI Rekomendacje**
- Przycisk generujący rekomendacje przez `/api/crm/ai-insights/recommendations`
- Przycisk generujący winback message przez `/api/crm/ai-insights/winback`

---

## Kohorty & Retencja (`/crm/cohorts`)

**Plik**: `app/(dashboard)/crm/cohorts/page.tsx` (311 linii)  
**API**: `/api/crm/cohorts`

### Sekcje

**Heatmapa retencji kohort**
- Osie: miesiąc kohorty (Y) × miesiące po pierwszym zakupie (X)
- Wartości: % retencji z gradientem koloru
- Date Range Picker do filtrowania zakresu kohort

**Time to Second Order**
- Histogram — rozkład dni do drugiego zamówienia
- Buckety: 0–7, 8–14, 15–30, 31–60, 61–90, 91–180, 180+ dni

**Kohorty by Context**
- Retencja w podziale na kontekst pierwszego zakupu (sezon, okazja)
- Porównanie: które "konteksty wejścia" generują lepszą retencję

**Insights**
- Automatycznie generowane obserwacje z danych retencji

---

## Lifecycle & Segmenty (`/crm/lifecycle`)

**Plik**: `app/(dashboard)/crm/lifecycle/page.tsx` (770 linii)  
**API**: `/api/crm/lifecycle`, `/api/crm/rfm`, `/api/crm/journey`, `/api/crm/segment-migration`

### Zakładki (3 taby)

**Tab: Lifecycle**
- Lejek lifecycle (horizontal bars z % konwersji)
- Segment × Risk matrix (heatmapa klikalną)
- Repeat Ladder (rozkład liczby zamówień)
- Worlds Performance (tabela)
- Date Range Picker

**Tab: RFM Scoring**
- Tabela rozkładu RFM segmentów (Champions, Loyal, itp.) z liczebnością i avg LTV
- Heatmapa Recency × Frequency (komórki z liczbą klientów)
- Histogram prawdopodobieństwa zakupu (buckety 0–100%)
- Metryki predykcyjne: total predicted LTV 12m, avg predicted LTV, liczba high-prob klientów

**Tab: Customer Journey**
- Flow diagram przejść między etapami journey
- Tabela transition counts (skąd → dokąd)
- Insights tekstowe

_(Segment Migration jest obsługiwana przez osobny endpoint i może być sub-sekcją Lifecycle lub osobną stroną)_

---

## Produkty & Światy (`/crm/products`)

**Plik**: `app/(dashboard)/crm/products/page.tsx` (452 linie)  
**API**: `/api/crm/products-analytics`, `/api/crm/launch-monitor`

### Zakładki (5 tabów)

**Tab: Produkty**
- Ranking produktów według: przychód, liczba klientów, AOV, retention
- Sortowanie i filtrowanie
- Date Range Picker

**Tab: Światy**
- Wyniki per "świat" (domena tematyczna): klienci, LTV, zamówienia, udział

**Tab: Sezonowość**
- Wyniki sprzedażowe per sezon × rok
- Tabela z heatmapą intensywności

**Tab: Cross-sell**
- Top 100 par produktów kupowanych razem
- Kolumny: produkt A, produkt B, liczba wspólnych zakupów, wskaźnik lift

**Tab: Launch Monitor**
- Nowe produkty i ich adopcja w 30/60/90 dni od premiery
- Metryki: liczba kupujących, przychód, % powtórzeń

---

## Promocje (`/crm/promotions`)

**Plik**: `app/(dashboard)/crm/promotions/page.tsx` (723 linie)  
**API**: `/api/crm/promotions`

### Zakładki (4 taby)

**Tab: Scorecard**
- Wyniki każdej promocji: przychód, transakcje, unikalni klienci, AOV, promo share
- Badge jakości promocji (relative do globalnego AOV)
- Sortowanie po dacie start_date malejąco

**Tab: Dependency**
- Rozkład uzależnienia od promocji (buckety: 0%, 1–25%, 26–50%, 51–75%, 76–100%)
- Identyfikacja klientów "promo-hunters"

**Tab: Sezonowość**
- Wyniki sprzedaży per sezon × rok
- Porównanie sezonów między latami

**Tab: Kalendarz**
- Timeline nadchodzących i historycznych promocji
- Lista nadchodzących okazji (Walentynki, Dzień Matki, Gwiazdka, itp.)
- Formularz dodawania nowej promocji (POST do `/api/crm/promotions`)

---

## Akcje CRM (`/crm/actions`)

**Plik**: `app/(dashboard)/crm/actions/page.tsx` (635 linii)  
**API**: `/api/crm/actions`, `/api/crm/lead-scoring`

### Zakładki (3 taby)

**Tab: Opportunity Queue**
6 predefiniowanych segmentów actionable:

| Segment ID | Opis | Filtr |
|---|---|---|
| `vip_reactivation` | VIP Reanimacja | Diamond/Platinum + Lost/HighRisk |
| `second_order` | Kandydaci na 2. zamówienie | orders_count=1, last_order 30–90 dni temu |
| `falling_frequency` | Spadająca częstotliwość | Platinum/Gold + Risk |
| `returning_at_risk` | Powracający zagrożeni | Returning + Risk/HighRisk |
| `dormant_loyals` | Uśpieni lojalni | (Gold+, długi brak aktywności) |
| `new_potential` | Nowi z potencjałem | New + OK |

Dla każdego segmentu:
- Liczba klientów + suma LTV
- Sugestia akcji (tekst)
- Przycisk drill-down → lista klientów (lazy load przez `/api/crm/actions?segment=...`)
- Eksport CSV (`/api/crm/actions/export?segment=...`)

**Tab: Lead Scoring**
- Overview temperatur (Hot/Warm/Cool/Cold) z liczebnością i % udziałem
- Top Hot Leads — tabela z lead_score, LTV, segmentem, dniem nieaktywności
- Eksport CSV dla wybranej temperatury
- Metodologia scoringu (opis algorytmu)

**Tab: Gift Analysis**
- Rozkład gift_label (Głównie prezenty / Mix / Głównie dla siebie)
- Insights: które segmenty są najbardziej "gift-oriented"

---

## Porównanie grup (`/crm/compare`)

**Plik**: `app/(dashboard)/crm/compare/page.tsx` (294 linie)  
**API**: `/api/crm/compare` (POST)

### Funkcje
- Dwa panele: Grupa A i Grupa B
- Dla każdej grupy: multi-select Segment, Risk Level, Świat
- Przycisk "Porównaj" → POST z definicjami grup
- Wyniki side-by-side:
  - Liczba klientów
  - Suma LTV
  - Średnie LTV
  - Średnia liczba zamówień
  - Rozkład segmentów (tabela z udziałami %)
  - Rozkład ryzyk
  - Delty między grupami

---

## Ruch & Pozyskanie (`/crm/traffic`)

**Plik**: `app/(dashboard)/crm/traffic/page.tsx` (802 linie)  
**API**: `/api/crm/traffic`  
**Źródło danych**: Google Analytics 4 Data API

### Zakładki (6 tabów)

**Tab: Overview**
- Kluczowe metryki GA4: sesje, użytkownicy, konwersje, revenue
- Period picker: 7d / 30d / 90d

**Tab: Źródła**
- Kanały pozyskania z sesjami i konwersjami (Organic, Direct, Email, Paid, Social, Referral)
- Podział na source/medium

**Tab: Funnel**
- Lejek konwersji: sesje → product views → cart → zakup
- Conversion rate między etapami

**Tab: Produkty**
- Wyświetlenia i zakupy produktów z GA4 (product performance)

**Tab: Wyszukiwanie**
- Frazy wyszukiwania wewnętrznego (Google Search Console via GA4)

**Tab: Geo & Devices**
- Rozkład geograficzny użytkowników (kraj, miasto)
- Rozkład urządzeń (desktop/mobile/tablet)
- Przeglądarki

---

## Import & Dane (`/crm/import`)

**Plik**: `app/(dashboard)/crm/import/page.tsx` (648 linii)  
**API**: `/api/crm/import/data-overview`, `/api/crm/ean-gaps`, `/api/crm/import/unmapped`

### Sekcje

**Upload CSV**
- Formularz wgrywania pliku CSV z danymi zakupowymi
- Obsługa plikóW z Shoper (eksport zamówień)

**Historia synchronizacji**
- Log ostatnich sync z tabeli `sync_log`
- Status (success/error), liczba rekordów, czas

**Przegląd danych (Data Overview)**
- Granulacja: daily / weekly / monthly / quarterly / yearly
- Liczba eventów, klientów, przychód per okres
- Źródło: `get_data_granulation()` RPC

**Braki EAN (EAN Gaps)**
- Produkty w `client_product_events` bez wpisu w `products`
- Lista z EAN-ami, nazwami produktów i liczebnością wystąpień
- Eksport do CSV do uzupełnienia taksonomii

**Data Quality Checklist**
- Sprawdzenie kompletności danych: brakujące EAN-y, produkty bez taksonomii, klienci bez segmentu

---

## Winback (`/crm/winback`)

**Plik**: `app/(dashboard)/crm/winback/page.tsx`  
**API**: `/api/crm/winback`, `/api/crm/winback/export`, `/api/crm/ai-insights/winback`

### Funkcje
- Lista klientów Lost i HighRisk priorytetowych do reaktywacji
- Filtry: tier (VIP/Lost/HighRisk/Wszystkie), świat, segment
- Paginacja
- Eksport CSV
- AI winback message per klient (via Gemini)

---

## Strony dodatkowe

### `/crm/analytics/behavior`
**Plik**: `app/(dashboard)/crm/analytics/behavior/page.tsx`  
Analityka zachowań zakupowych (promo hunters, basket size, timing).

### `/crm/analytics/worlds`
**Plik**: `app/(dashboard)/crm/analytics/worlds/page.tsx`  
Szczegółowa analityka "światów" (domen tematycznych).

---

## Wspólne komponenty

### `DateRangePicker` (`app/(dashboard)/crm/components/DateRangePicker.tsx`)
Reużywalny picker zakresu dat. Presety: 7d, 30d, 90d, 180d, YTD, 12m, Cała historia, Zakres własny. Callback `onChange({ from, to, label })`.
