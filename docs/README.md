# CRM Nadwyraz — Dokumentacja

## Spis treści

1. [Architektura systemu](./architecture.md)
2. [Baza danych — tabele, widoki, funkcje](./database.md)
3. [API Routes](./api-routes.md)
4. [Strony i zakładki CRM](./pages.md)
5. [Pipeline danych i cron](./pipeline.md)
6. [Konfiguracja i deployment](./config.md)

---

## Szybki przegląd

### Czym jest CRM Nadwyraz?

CRM Nadwyraz to wewnętrzny system zarządzania relacjami z klientami zbudowany dla marki **Nadwyraz.com** — polskiej marki narracyjnych skarpet, odzieży i akcesoriów o charakterze literacko-kulturowym. System obsługuje bazę ponad 150 000 klientów i kilkaset tysięcy eventów zakupowych, synchronizowanych codziennie ze sklepu Shoper.

System umożliwia analizę segmentów klientów, lifecycle marketingu, RFM scoringu, predykcji zakupowych, analizy produktów, promocji, ruchu GA4 oraz eksportu list do systemów e-mail marketingowych (edrone). Zbudowany na Next.js + Supabase + Vercel, bez zewnętrznego CRM — całość działa na własnym stacku.

### Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Next.js 16 App Router, TypeScript (strony), React 19 |
| Backend API | JavaScript API routes (Next.js route handlers) |
| Baza danych | Supabase (PostgreSQL), materialized views, pg_cron, RPC functions |
| Hosting | Vercel (cron jobs, serverless functions) |
| Synchronizacja zamówień | Shoper API (REST, Bearer token) |
| Analityka ruchu | Google Analytics 4 Data API (service account) |
| AI insights | Anthropic Claude, OpenAI GPT, Google Gemini (via callAI wrapper) |
| E-mail | Resend API |
| Design | IBM Plex Mono, inline styles, jasny theme, akcent `#b8763a` |

### Zakładki CRM

| URL | Nazwa | Opis |
|---|---|---|
| `/crm/analytics` | Executive Dashboard | Główny dashboard KPI, wykresy, matrix segmentów, opportunity cards |
| `/crm/clients` | Klienci | Lista klientów z filtrami, sortowaniem, eksportem CSV/edrone |
| `/crm/clients/[id]` | Profil 360° | Pełny profil klienta: barometr, DNA, historia, notatki |
| `/crm/cohorts` | Kohorty & Retencja | Heatmapa retencji, time-to-second-order, kohorty by context |
| `/crm/lifecycle` | Lifecycle & Segmenty | Lejek, RFM scoring, Customer Journey, migracja segmentów |
| `/crm/products` | Produkty & Światy | Analityka produktów, światy, sezonowość, cross-sell, launch monitor |
| `/crm/promotions` | Promocje | Scorecard promocji, dependency, sezonowość, kalendarz |
| `/crm/actions` | Akcje CRM | Opportunity Queue, Lead Scoring, Gift Analysis |
| `/crm/compare` | Porównanie grup | Side-by-side porównanie dwóch segmentów/grup klientów |
| `/crm/traffic` | Ruch & Pozyskanie | GA4: overview, źródła, funnel, produkty, wyszukiwanie, geo/urządzenia |
| `/crm/import` | Import & Dane | Upload CSV, historia sync, przegląd danych, braki EAN |
| `/crm/winback` | Winback | Lista klientów do reaktywacji (Lost/HighRisk VIP) |

---

## Konwencje kodu

- **Strony (`app/(dashboard)/crm/`)**: TypeScript `.tsx`, `'use client'`, inline styles (bez Tailwind)
- **API routes (`app/api/crm/`)**: JavaScript `.js`, `export const dynamic = 'force-dynamic'`
- **Font**: IBM Plex Mono (monospace) — dla całego CRM
- **Kolor akcentu**: `#b8763a` (brąz/karmel)
- **Locale**: pl-PL, formatowanie dat i walut po polsku
- **Cache**: `Cache-Control: private, max-age=60, stale-while-revalidate=300` dla większości endpointów
- **Auth**: Supabase Auth — RLS policies na tabelach, service_role dla API routes
