# Architektura systemu

## Diagram przepływu danych

```
┌─────────────────────────────────────────────────────────────────┐
│                        ŹRÓDŁA DANYCH                           │
│  Shoper API (zamówienia)    Google Analytics 4 (ruch)          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL CRON JOBS (codziennie)                      │
│                                                                 │
│  06:00 UTC  /api/cron/segment-snapshot                         │
│             → take_segment_snapshot()                           │
│             → zapis do segment_snapshots                        │
│                                                                 │
│  09:00 UTC  /api/cron/sync-orders                              │
│             → Shoper API (ostatnie 2 dni)                       │
│             → upsert: master_key, client_product_events,        │
│               clients_360                                       │
│                                                                 │
│  10:00 UTC  Supabase pg_cron: recalculate-crm-daily            │
│  (nie Vercel) → recalculate_all_ltv()                          │
│             → refresh_crm_views() (wszystkie matviews)          │
│                                                                 │
│  10:30 UTC  /api/cron/recalculate-scores                       │
│             → recalculate_rfm_scores()                          │
│             → recalculate_predictive_scores()                   │
│             → recalculate_gift_scores()                         │
│             → recalculate_lead_scores()                         │
│             → refresh_view_rfm_distribution()                   │
│             → refresh_view_lead_distribution()                  │
│             → refresh_view_gift_distribution()                  │
│             → refresh_view_launch_monitor()                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE (PostgreSQL)                          │
│                                                                 │
│  Tabele główne:                                                 │
│    clients_360          ← profil klienta (LTV, segmenty, RFM)  │
│    client_product_events← historia zakupów (event per linia)   │
│    products             ← taksonomia produktów                  │
│    client_taxonomy_summary ← podsumowanie DNA klienta          │
│    promotions           ← definicje promocji                    │
│    client_notes         ← notatki CRM do klientów              │
│    segment_snapshots    ← dzienne snapshoty segmentów          │
│    user_dashboard_config← konfiguracja widgetów dashboardu     │
│    master_key           ← hash email ↔ client_id (PII)        │
│                                                                 │
│  Materialized Views (odświeżane codziennie):                   │
│    crm_dashboard_kpis, crm_revenue_monthly,                    │
│    crm_segment_risk_matrix, crm_lifecycle_funnel,              │
│    crm_worlds_performance, crm_promo_share,                    │
│    crm_cohort_retention, crm_time_to_second_order,             │
│    crm_cohort_by_context, crm_product_performance,             │
│    crm_season_performance, crm_cross_sell, crm_repeat_ladder,  │
│    crm_promo_scorecard, crm_opportunity_queue,                 │
│    crm_promo_dependency, crm_rfm_distribution,                 │
│    crm_customer_journey, crm_journey_transitions,              │
│    crm_launch_monitor, crm_lead_distribution,                  │
│    crm_gift_distribution, crm_tag_stats,                       │
│    crm_behavior_segments, crm_behavior_seasons,                │
│    crm_behavior_promos, crm_behavior_product_groups,           │
│    crm_behavior_tags, crm_overview, crm_segments,              │
│    crm_risk, crm_worlds, crm_occasions                         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                          │
│                                                                 │
│  /app/api/crm/*  ← ~50 API routes (JavaScript)                │
│       ↓                                                        │
│  /app/(dashboard)/crm/*  ← strony CRM (TypeScript)            │
│       ↓                                                        │
│  Przeglądarka użytkownika                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Struktura katalogów

```
/
├── app/
│   ├── (dashboard)/
│   │   └── crm/
│   │       ├── page.tsx                    ← przekierowanie lub strona główna
│   │       ├── analytics/
│   │       │   ├── page.tsx                ← Executive Dashboard
│   │       │   ├── behavior/page.tsx       ← Analityka zachowań (strona dodatkowa)
│   │       │   └── worlds/page.tsx         ← Światy (strona dodatkowa)
│   │       ├── clients/
│   │       │   ├── page.tsx                ← Lista klientów
│   │       │   └── [id]/page.tsx           ← Profil klienta 360°
│   │       ├── cohorts/page.tsx            ← Kohorty & Retencja
│   │       ├── lifecycle/page.tsx          ← Lifecycle, RFM, Journey
│   │       ├── products/page.tsx           ← Produkty, Światy, Launch Monitor
│   │       ├── promotions/page.tsx         ← Promocje i Kalendarz
│   │       ├── actions/page.tsx            ← Akcje CRM, Lead Scoring, Gift
│   │       ├── compare/page.tsx            ← Porównanie grup
│   │       ├── traffic/page.tsx            ← GA4 Ruch & Pozyskanie
│   │       ├── import/page.tsx             ← Import CSV, EAN gaps
│   │       ├── winback/page.tsx            ← Winback VIP
│   │       └── components/
│   │           └── DateRangePicker.tsx     ← Wspólny picker zakresu dat
│   │
│   └── api/
│       ├── crm/                            ← ~50 endpointów API (JavaScript)
│       │   ├── dashboard/route.js
│       │   ├── dashboard-config/route.js
│       │   ├── clients/
│       │   │   ├── list/route.js
│       │   │   ├── export/route.js
│       │   │   ├── export-edrone/route.js
│       │   │   └── [id]/
│       │   │       ├── route.js
│       │   │       └── notes/route.js
│       │   ├── cohorts/route.js
│       │   ├── lifecycle/route.js
│       │   ├── rfm/route.js
│       │   ├── journey/route.js
│       │   ├── products-analytics/route.js
│       │   ├── promotions/route.js
│       │   ├── actions/
│       │   │   ├── route.js
│       │   │   └── export/route.js
│       │   ├── compare/route.js
│       │   ├── traffic/route.js
│       │   ├── segment-migration/route.js
│       │   ├── lead-scoring/route.js
│       │   ├── launch-monitor/route.js
│       │   ├── winback/
│       │   │   ├── route.js
│       │   │   └── export/route.js
│       │   ├── import/
│       │   │   ├── data-overview/route.js
│       │   │   └── unmapped/route.js
│       │   ├── ean-gaps/route.js
│       │   ├── ai-insights/
│       │   │   ├── route.js
│       │   │   ├── recommendations/route.js
│       │   │   ├── segment/route.js
│       │   │   └── winback/route.js
│       │   ├── analytics/
│       │   │   ├── recent-orders/route.js
│       │   │   ├── revenue-trend/route.js
│       │   │   └── top-diamonds/route.js
│       │   ├── behavior/
│       │   │   ├── route.js
│       │   │   └── cobuying/route.js
│       │   ├── category-mapping/
│       │   │   ├── route.js
│       │   │   └── unmapped/route.js
│       │   ├── audit/
│       │   │   ├── route.js
│       │   │   └── ltv-timeline/route.js
│       │   ├── pii/route.js
│       │   ├── reveal/route.js
│       │   ├── predictive/route.js
│       │   ├── occasions/route.js
│       │   ├── overview/route.js
│       │   ├── overview-full/route.js
│       │   ├── filter-options/route.js
│       │   ├── segments/advanced/route.js
│       │   ├── refresh-views/route.js
│       │   ├── recalculate-ltv/route.js
│       │   ├── recalculate-ltv-full/route.js
│       │   ├── deduplicate/route.js
│       │   ├── fix-historical/route.js
│       │   └── unmapped/route.js
│       │
│       └── cron/
│           ├── sync-orders/route.js        ← Synchronizacja Shoper (9:00 UTC)
│           ├── segment-snapshot/route.js   ← Snapshot segmentów (6:00 UTC)
│           └── recalculate-scores/route.js ← RFM + scoring (10:30 UTC)
│
├── lib/
│   ├── supabase.js                         ← Supabase client (anon)
│   ├── supabase/server.js                  ← getServiceClient() — service_role
│   ├── ga4.js                              ← Google Analytics 4 Data API client
│   ├── legs-palette.js                     ← Paleta kolorów (CSS)
│   └── permissions.js                      ← Sprawdzanie uprawnień użytkownika
│
├── supabase/
│   └── migrations/                         ← SQL migrations 001–068
│
├── vercel.json                             ← Cron jobs + function timeouts
└── package.json
```

## Konwencje kodu

### Strony (`app/(dashboard)/crm/*.tsx`)
- Zawsze `'use client'`
- Inline styles (bez Tailwind, bez CSS modules)
- Font: `fontFamily: 'IBM Plex Mono, monospace'`
- Kolor akcentu: `#b8763a`
- Kolor tekstu głównego: `#1a1a1a`
- Kolor tła karty: `#fff` lub `#faf8f5`
- Kolor muted: `#6b6b6b`
- Kolor border: `#e8e0d8`
- Data fetching: `useEffect` + `fetch('/api/crm/...')` — bez React Query, bez SWR

### API routes (`app/api/crm/*.js`)
- JavaScript (nie TypeScript)
- `export const dynamic = 'force-dynamic'` na każdym route
- Supabase: `getServiceClient()` z `lib/supabase/server.js` (service_role) lub bezpośrednio `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`
- Cache: `Cache-Control: private, max-age=60, stale-while-revalidate=300` dla większości endpointów
- Response: `Response.json(...)` lub `NextResponse.json(...)`

### Identyfikacja klientów
- `client_id` to string w formacie `NZ-XXXXXXXXXX` (prefiks + 10 znaków hex MD5 emaila uppercase)
- `email_hash` w `master_key` to MD5 emaila (lowercase) — sam email nigdy nie jest przechowywany w tabeli głównej
- Odszyfrowanie emaila: `master_key.email_encrypted` (AES-256-GCM) — tylko przez endpoint `/api/crm/reveal` z sesją PII

### Segmentacja klientów
- **Legacy segment** (5 poziomów): `Diamond` (≥15 zamówień) → `Platinum` → `Gold` → `Returning` → `New`
- **Risk level** (4 poziomy): `OK` → `Risk` → `HighRisk` → `Lost`
- **RFM segment** (12 kategorii): Champions, Loyal, Potential Loyal, Recent, Promising, Need Attention, About to Sleep, Cant Lose, At Risk, Lost, Hibernating, Other
- **Lead temperature**: Hot, Warm, Cool, Cold
- **Gift label**: Głównie prezenty, Mix: siebie + prezenty, Głównie dla siebie
