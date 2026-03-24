# Google Apps Script — Nadwyraz CRM Sync

## Pliki
- `sync_taxonomy.gs` — taksonomia produktów (warianty z EAN)
- `sync_promotions.gs` — matryca okazji i promocji
- `sync_price_history.gs` — matryca cen

## Konfiguracja Script Properties
W każdym projekcie Apps Script ustaw:
- `SYNC_SECRET` = [wartość z .env SYNC_SECRET]
- `VERCEL_URL` = `consensus-engine-chi.vercel.app`

## Arkusze Google Sheets
| Skrypt | Plik Sheets | Zakładka |
|--------|-------------|----------|
| sync_taxonomy.gs | Kategorie_CRM360_Taxonomy | PRODUCTS_V5_2+warianty |
| sync_promotions.gs | Matryca_okazji | PROMO_MATRIX |
| sync_price_history.gs | Matryca_cen | Arkusz1 |

## Triggery
| Skrypt | Częstotliwość |
|--------|---------------|
| sync_taxonomy.gs | Co 30 minut |
| sync_promotions.gs | Co 30 minut |
| sync_price_history.gs | Raz dziennie |

## Matchowanie produktów
ETL matchuje zakupy klientów po EAN produktu (`product_code` z Shopera).
Zakładka `PRODUCTS_V5_2+warianty` zawiera EAN per wariant.
Produkty bez wariantów mają Wariant = "-".
Fallback: text match po nazwie dla starych danych bez EAN.

## Jak wdrożyć
1. Otwórz plik Google Sheets
2. Rozszerzenia → Apps Script
3. Wklej zawartość pliku `.gs`
4. Ustaw Script Properties (`SYNC_SECRET`, `VERCEL_URL`)
5. Uruchom `setupTrigger()` raz ręcznie
6. Sprawdź Dziennik wykonywania

## Endpointy API
- `POST /api/sync/taxonomy` → taksonomia produktów
- `POST /api/sync/promotions` → matryca okazji
- `POST /api/sync/price-history` → matryca cen

Wszystkie wymagają: `Authorization: Bearer SYNC_SECRET`
