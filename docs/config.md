# Konfiguracja i deployment

## Zmienne środowiskowe

Wymagane zarówno w `.env.local` (development) jak i w panelu Vercel (production).

### Supabase

| Zmienna | Opis | Wymagana w |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu Supabase (publiczny) | Frontend + Backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klucz anon Supabase (publiczny, RLS) | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz service_role (tajny, pełny dostęp) | Backend API routes tylko |
| `SUPABASE_URL` | URL Supabase (alias do NEXT_PUBLIC_... w niektórych routach) | Backend (starsze routy) |

> **Uwaga bezpieczeństwa**: `SUPABASE_SERVICE_ROLE_KEY` musi NIGDY nie trafić do frontendu. Używaj tylko w `app/api/` i `lib/supabase/server.js`.

### Shoper API

| Zmienna | Opis |
|---|---|
| `SHOPER_URL` | URL sklepu Shoper (np. `https://nadwyraz.com`) |
| `SHOPER_CLIENT_SECRET` | Token Bearer do Shoper API (primary) |
| `SHOPER_API_TOKEN` | Fallback token (jeśli SHOPER_CLIENT_SECRET nie ustawiony) |

### Google Analytics 4

| Zmienna | Opis |
|---|---|
| `GA4_PROPERTY_ID` | ID usługi GA4 (tylko cyfry, np. `429904868`) |
| `GA4_CLIENT_EMAIL` | Email konta usługi Google (service account) |
| `GA4_PRIVATE_KEY` | Klucz prywatny RSA (w cudzysłowach, `\n` jako dosłowne `\n`) |

> **Ważne format GA4_PRIVATE_KEY**: W Vercel ustaw wartość jako string z dosłownymi `\n` wewnątrz cudzysłowów. Przykład: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

### AI (Claude, OpenAI, Gemini)

| Zmienna | Model | Użycie |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude (Sonnet) | `/api/crm/ai-insights`, `/api/crm/ai-insights/segment` |
| `OPENAI_API_KEY` | GPT (gpt-5.4) | `/api/crm/ai-insights/recommendations` |
| `GEMINI_API_KEY` | Gemini Flash | `/api/crm/ai-insights/winback` |
| `GOOGLE_AI_API_KEY` | Google AI (alias) | Alternatywny klucz dla Gemini |

### Bezpieczeństwo i autoryzacja

| Zmienna | Opis |
|---|---|
| `CRON_SECRET` | Secret do autoryzacji endpointów cron (`Authorization: Bearer ...`) |
| `SYNC_SECRET` | Secret do synchronizacji (Google Sheets lub inne zewnętrzne triggery) |
| `ENCRYPTION_KEY` | Klucz AES-256-GCM do szyfrowania PII (email, imię, nazwisko) |

### Komunikacja

| Zmienna | Opis |
|---|---|
| `RESEND_API_KEY` | Klucz API Resend do wysyłania emaili (OTP, notyfikacje) |

---

## Przykładowy `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dayrmhsdpcgakbsfjkyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_URL=https://dayrmhsdpcgakbsfjkyp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Shoper
SHOPER_URL=https://nadwyraz.com
SHOPER_CLIENT_SECRET=twoj_token_shoper

# Google Analytics 4
GA4_PROPERTY_ID=429904868
GA4_CLIENT_EMAIL=crm-service@projekt.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# Security
CRON_SECRET=losowy-tajny-string-minimum-32-znaki
SYNC_SECRET=inny-tajny-string
ENCRYPTION_KEY=32-bajtowy-hex-klucz-AES256

# Email
RESEND_API_KEY=re_...
```

---

## Deployment

### Vercel

- **Repo**: `Adam-Mickiewicz/consensus-engine` (GitHub)
- **Branch**: `main` — auto-deploy przy każdym push
- **Framework**: Next.js (auto-detected)
- **Build command**: `next build` (z Turbopack)
- **Output**: standalone Next.js
- **Region**: domyślny Vercel (EU zalecane dla compliance)

**Cron jobs** skonfigurowane w `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/segment-snapshot",    "schedule": "0 6 * * *" },
    { "path": "/api/cron/sync-orders",         "schedule": "0 9 * * *" },
    { "path": "/api/cron/recalculate-scores",  "schedule": "30 10 * * *" }
  ]
}
```

**Function timeouts** (niestandardowe):
- `sync-orders`: 800s (wymagane dla dużych importów Shoper)

### Supabase

- **Projekt ID**: `dayrmhsdpcgakbsfjkyp`
- **Region**: sprawdź w panelu Supabase (Settings → General)
- **Plan**: Pro (wymagany dla pg_cron i większych baz)
- **pg_cron**: `recalculate-crm-daily` — uruchamia LTV + refresh views o 10:00 UTC

Aby sprawdzić pg_cron w Supabase:
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### GitHub Codespace (środowisko developerskie)

- Dev environment: GitHub Codespace
- Terminal deweloperski: `npm run dev`
- Deploy ręczny: `git push` (auto) lub `npx vercel --prod`
- Claude Code: `claude --dangerously-skip-permissions` (dla skryptów migracji)

---

## Pierwsze uruchomienie (dla nowej osoby)

### 1. Sklonuj repo

```bash
git clone https://github.com/Adam-Mickiewicz/consensus-engine.git
cd consensus-engine
```

### 2. Zainstaluj zależności

```bash
npm install
```

### 3. Skonfiguruj zmienne środowiskowe

Skopiuj przykład i uzupełnij wartości:
```bash
cp .env.local.example .env.local  # jeśli plik istnieje
# lub stwórz ręcznie .env.local z wartościami z sekcji wyżej
```

Skontaktuj się z właścicielem projektu po klucze Supabase, Shoper, GA4.

### 4. Uruchom serwer deweloperski

```bash
npm run dev
```

Otwórz: `http://localhost:3000/crm/analytics`

### 5. Sprawdź czy dane są dostępne

Wejdź na `/crm/analytics`. Jeśli dashboard jest pusty:
1. Sprawdź w Supabase SQL Editor czy tabele mają dane:
   ```sql
   SELECT COUNT(*) FROM clients_360;
   SELECT COUNT(*) FROM client_product_events;
   ```
2. Jeśli dane są, odśwież views:
   ```sql
   SELECT refresh_crm_views();
   ```
3. Jeśli views są puste, uruchom pełny pipeline:
   ```sql
   SELECT recalculate_all_ltv();
   SELECT refresh_crm_views();
   SELECT recalculate_rfm_scores();
   SELECT recalculate_predictive_scores();
   SELECT recalculate_gift_scores();
   SELECT recalculate_lead_scores();
   ```

---

## Migracje bazy danych

Migracje w `supabase/migrations/` (numerowane 001–068+). Uruchamiaj przez Supabase CLI lub wklej bezpośrednio w SQL Editor:

```bash
# Przez CLI (wymaga supabase CLI zainstalowanego)
supabase db push

# Lub ręcznie w SQL Editor: wklej zawartość pliku .sql
```

**Kolejność ma znaczenie** — nie pomijaj migracji. Każda buduje na poprzednich.

---

## Troubleshooting deployment

| Problem | Rozwiązanie |
|---|---|
| Build fail: `Module not found` | `npm install` ponownie; sprawdź `package.json` |
| Dashboard pusty po deployu | Odśwież views w Supabase: `SELECT refresh_crm_views()` |
| GA4 zwraca 403 | Sprawdź `GA4_CLIENT_EMAIL` — musi mieć dostęp "Viewer" do GA4 property |
| GA4 klucz błędny | `GA4_PRIVATE_KEY` musi mieć dosłowne `\n` (nie nowe linie) |
| Cron nie działa | Sprawdź `CRON_SECRET` — musi być identyczny w Vercel i w kodzie |
| Shoper 401 | Sprawdź `SHOPER_CLIENT_SECRET`; token mógł wygasnąć |
| Supabase 403 | Sprawdź `SUPABASE_SERVICE_ROLE_KEY` — musi być service_role, nie anon |
| PII nie dekryptuje | Sprawdź `ENCRYPTION_KEY` — musi być identyczny jak przy szyfrowaniu |
| `process.env` undefined w runtime | Zmienne bez `NEXT_PUBLIC_` są dostępne tylko w Server Components i API routes |

---

## Architektura bezpieczeństwa

### RLS (Row Level Security)
Włączone na wszystkich tabelach. Domyślne policy:
- `authenticated` → SELECT (odczyt)
- `service_role` → pełny dostęp (INSERT/UPDATE/DELETE)

### PII (dane osobowe)
- Emaile **nigdy** nie są przechowywane w plaintext w `clients_360`
- `master_key.email_hash` = MD5 emaila (do lookup)
- `master_key.email_encrypted` = AES-256-GCM zaszyfrowany email
- Dostęp do PII wymaga: autoryzacji Supabase Auth + aktywnej sesji PII (endpoint `/api/crm/pii`) + opcjonalnie 2FA (TOTP lub email OTP)
- Każdy odczyt PII logowany do `vault_access_log`

### Cron autoryzacja
Endpointy cron weryfikują `Authorization: Bearer CRON_SECRET`. Vercel automatycznie dołącza ten nagłówek.

### AI — brak PII w promptach
Prompty do AI zawierają dane zagregowane i `client_id` (hash), nie emaile ani nazwiska klientów.
