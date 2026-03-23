/**
 * GET /api/crm/clients/export-edrone
 *
 * Generuje plik CSV gotowy do importu do systemu edrone (Mission Control → Kontakty → Import).
 *
 * PARAMETRY QUERY:
 *   Filtry klientów (te same co /api/crm/clients/list):
 *     segment      – legacy_segment (Diamond / Platinum / Gold / Returning / New)
 *     risk         – risk_level (OK / Risk / HighRisk / Lost)
 *     world        – ulubiony_swiat
 *     date_from    – ostatni zakup ≥ data (YYYY-MM-DD)
 *     date_to      – ostatni zakup ≤ data (YYYY-MM-DD)
 *
 *   Zakres eksportu:
 *     scope=all      (domyślnie) – wszyscy klienci spełniający filtry
 *     scope=winback  – tylko VIP REANIMACJA + Lost + HighRisk
 *
 * FORMAT CSV (edrone):
 *   email, first_name, last_name, status, subscription_date, gender, tags
 *
 * SYSTEM TAGÓW:
 *   Segment:     Diamond | Platinum | Gold | Returning | New
 *   Ryzyko:      Aktywny | Ryzyko | WysokeRyzyko | Utracony | WinbackVIP
 *   Świat:       Swiat_Literatura | Swiat_Koty | Swiat_Polska itd.
 *   Okazje:      Okazja_DzienMatki | Okazja_Swieta itd.
 *   Zachowanie:  PromoHunter | FullPrice | Kolekcjoner | JedenProdukt
 *   Kategorie:   Kupuje_Skarpety | Kupuje_Koszulki | Kupuje_Kubki itd.
 *   LTV bucket:  LTV_Ponizej100 | LTV_100_500 | LTV_500_1000 | LTV_1000_3000 | LTV_Powyzej3000
 *   Ostatni zak: OstatniZakup_7dni | _30dni | _90dni | _180dni | _Powyzej180
 *   Rok 1. zak:  Nowy2022 | Nowy2023 | Nowy2024 | Nowy2025 | Nowy2026
 *
 * BEZPIECZEŃSTWO:
 *   - Wymaga service_role (serwer-side only — nigdy nie eksponuj klientowi)
 *   - Każdy eksport jest logowany do tabeli vault_access_log
 *   - master_key jest tabelą z ograniczonym dostępem — tylko service_role
 */

import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic   = 'force-dynamic';
export const maxDuration = 120; // duże eksporty mogą trwać ~60s

// ─── Stałe ────────────────────────────────────────────────────────────────────

const MAX_CLIENTS   = 50_000; // bezpieczny limit edrone
const BATCH_SIZE    = 1_000;  // rozmiar batcha przy pobieraniu klientów
const EVENT_BATCH   = 500;    // rozmiar batcha przy pobieraniu eventów

/** Mapowanie price_category_id → etykieta tagu Kupuje_* */
const CATEGORY_MAP = {
  SKARPETY:          'Skarpety',
  SKARPETY_STOPKI:   'Skarpety',
  KOSZULKA_DAMSKA:   'Koszulki',
  KOSZULKA_MESKA:    'Koszulki',
  KOSZULKA_UNISEX:   'Koszulki',
  KUBEK:             'Kubki',
  KUBEK_500ML:       'Kubki',
  TORBA:             'Torby',
  TORBA_NA_KSIAZKI:  'Torby',
  BLUZA:             'Bluzy',
  CZAPKA:            'Czapki',
  SZALIK:            'Szaliki',
  BRELOK:            'Breloki',
  MAGNES:            'Magnesy',
  KARTKA:            'Kartki',
  KALENDARZ:         'Kalendarze',
};

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

/**
 * Usuwa polskie znaki diakrytyczne i zastępuje spacje podkreślnikiem.
 * Służy do normalizacji nazw tagów (światy, okazje).
 */
function slugifyTag(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // usuń znaki diakrytyczne
    .replace(/\u0142/g, 'l')  // ł → l (NFD nie obsługuje ł)
    .replace(/\u0141/g, 'L')  // Ł → L
    .replace(/\s+/g, '_')     // spacje → _
    .replace(/[^A-Za-z0-9_]/g, ''); // usuń znaki specjalne
}

/**
 * Oblicza liczbę dni między datą a dzisiaj.
 * Zwraca null jeśli data jest pusta.
 */
function daysSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Buduje pełny zestaw tagów edrone dla jednego klienta.
 *
 * @param {Object} client    – wiersz z clients_360
 * @param {Object} events    – zagregowane dane z client_product_events
 * @returns {string[]}       – tablica tagów
 */
function buildTags(client, events) {
  const tags = [];
  const {
    legacy_segment, risk_level, ltv, orders_count,
    last_order, first_order, ulubiony_swiat, winback_priority,
  } = client;

  const {
    seasons = [],
    promoPct = null,
    categories = new Set(),
    uniqueProducts = 0,
  } = events;

  // ── 1. SEGMENT ──────────────────────────────────────────────────────────────
  if (legacy_segment) tags.push(legacy_segment);

  // ── 2. RYZYKO / AKTYWNOŚĆ ───────────────────────────────────────────────────
  const isVipSegment  = legacy_segment === 'Diamond' || legacy_segment === 'Platinum';
  const isHighRisk    = risk_level === 'HighRisk';
  const isLost        = risk_level === 'Lost';

  if (isVipSegment && (isLost || isHighRisk)) {
    tags.push('WinbackVIP');
  }
  const riskTagMap = { OK: 'Aktywny', Risk: 'Ryzyko', HighRisk: 'WysokeRyzyko', Lost: 'Utracony' };
  if (risk_level && riskTagMap[risk_level]) tags.push(riskTagMap[risk_level]);

  // ── 3. ŚWIAT ─────────────────────────────────────────────────────────────────
  if (ulubiony_swiat) {
    tags.push('Swiat_' + slugifyTag(ulubiony_swiat));
  }

  // ── 4. OKAZJE (z historii zakupów) ──────────────────────────────────────────
  for (const season of seasons) {
    if (season) tags.push('Okazja_' + slugifyTag(season));
  }

  // ── 5. ZACHOWANIE ZAKUPOWE ──────────────────────────────────────────────────
  if (promoPct !== null) {
    if (promoPct >= 60) tags.push('PromoHunter');
    if (promoPct <= 20) tags.push('FullPrice');
  }
  if (uniqueProducts >= 10 && (orders_count ?? 0) >= 5) tags.push('Kolekcjoner');
  if (uniqueProducts === 1) tags.push('JedenProdukt');

  // ── 6. KATEGORIE PRODUKTÓW ──────────────────────────────────────────────────
  const addedCategories = new Set();
  for (const rawCat of categories) {
    const mapped = CATEGORY_MAP[rawCat?.toUpperCase()];
    if (mapped && !addedCategories.has(mapped)) {
      tags.push('Kupuje_' + mapped);
      addedCategories.add(mapped);
    }
  }

  // ── 7. LTV BUCKET ────────────────────────────────────────────────────────────
  const ltvVal = Number(ltv) || 0;
  if      (ltvVal < 100)   tags.push('LTV_Ponizej100');
  else if (ltvVal < 500)   tags.push('LTV_100_500');
  else if (ltvVal < 1000)  tags.push('LTV_500_1000');
  else if (ltvVal < 3000)  tags.push('LTV_1000_3000');
  else                     tags.push('LTV_Powyzej3000');

  // ── 8. OSTATNI ZAKUP ─────────────────────────────────────────────────────────
  const days = daysSince(last_order);
  if (days !== null) {
    if      (days <=   7) tags.push('OstatniZakup_7dni');
    else if (days <=  30) tags.push('OstatniZakup_30dni');
    else if (days <=  90) tags.push('OstatniZakup_90dni');
    else if (days <= 180) tags.push('OstatniZakup_180dni');
    else                  tags.push('OstatniZakup_Powyzej180');
  }

  // ── 9. ROK PIERWSZEGO ZAKUPU ─────────────────────────────────────────────────
  if (first_order) {
    const year = new Date(first_order).getFullYear();
    if (year >= 2022 && year <= 2026) tags.push('Nowy' + year);
  }

  return tags;
}

// ─── Pobieranie danych ────────────────────────────────────────────────────────

/**
 * Pobiera wszystkich klientów pasujących do filtrów (do MAX_CLIENTS rekordów).
 * Używa paginacji batchami BATCH_SIZE żeby uniknąć timeoutu.
 */
async function fetchClients(sb, { segment, risk, world, date_from, date_to, scope }) {
  const rows = [];

  // Zlicz najpierw żeby wiedzieć ile stron
  let countQ = sb.from('clients_360').select('client_id', { count: 'exact', head: true });
  if (segment)   countQ = countQ.eq('legacy_segment', segment);
  if (risk)      countQ = countQ.eq('risk_level', risk);
  if (world)     countQ = countQ.eq('ulubiony_swiat', world);
  if (date_from) countQ = countQ.gte('last_order', date_from);
  if (date_to)   countQ = countQ.lte('last_order', date_to);
  if (scope === 'winback') {
    // Tylko klienci z oznaczonym winback_priority (VIP REANIMACJA, Lost, HighRisk)
    countQ = countQ.not('winback_priority', 'is', null);
  }
  const { count } = await countQ;
  const total = Math.min(count ?? 0, MAX_CLIENTS);

  const pages = Math.ceil(total / BATCH_SIZE);
  for (let i = 0; i < pages; i++) {
    let q = sb.from('clients_360')
      .select('client_id,legacy_segment,risk_level,ltv,orders_count,last_order,first_order,ulubiony_swiat,winback_priority')
      .order('ltv', { ascending: false })
      .range(i * BATCH_SIZE, (i + 1) * BATCH_SIZE - 1);

    if (segment)   q = q.eq('legacy_segment', segment);
    if (risk)      q = q.eq('risk_level', risk);
    if (world)     q = q.eq('ulubiony_swiat', world);
    if (date_from) q = q.gte('last_order', date_from);
    if (date_to)   q = q.lte('last_order', date_to);
    if (scope === 'winback') q = q.not('winback_priority', 'is', null);

    const { data, error } = await q;
    if (error) throw new Error(`clients_360 fetch error: ${error.message}`);
    if (data) rows.push(...data);
  }

  return rows;
}

/**
 * Pobiera zagregowane dane z client_product_events dla zestawu client_id.
 * Zwraca mapę: client_id → { seasons[], promoPct, categories Set, uniqueProducts }
 *
 * Zapytania batchowane po EVENT_BATCH aby uniknąć limitu URL/parametrów.
 */
async function fetchEventAggregates(sb, clientIds) {
  /** @type {Map<string, {seasons: Set<string>, promoCount: number, totalCount: number, categories: Set<string>, eans: Set<string>}>} */
  const agg = new Map();
  for (const id of clientIds) {
    agg.set(id, { seasons: new Set(), promoCount: 0, totalCount: 0, categories: new Set(), eans: new Set() });
  }

  // Batche po EVENT_BATCH żeby nie przekroczyć limitu parametrów Supabase
  for (let i = 0; i < clientIds.length; i += EVENT_BATCH) {
    const batchIds = clientIds.slice(i, i + EVENT_BATCH);
    const { data, error } = await sb
      .from('client_product_events')
      .select('client_id,season,is_promo,price_category_id,ean')
      .in('client_id', batchIds);

    if (error) throw new Error(`client_product_events fetch error: ${error.message}`);
    for (const row of data ?? []) {
      const a = agg.get(row.client_id);
      if (!a) continue;
      if (row.season)              a.seasons.add(row.season);
      if (row.price_category_id)   a.categories.add(row.price_category_id);
      if (row.ean)                 a.eans.add(row.ean);
      a.totalCount++;
      if (row.is_promo) a.promoCount++;
    }
  }

  // Przekształć agregaty w końcowy format
  const result = new Map();
  for (const [id, a] of agg) {
    result.set(id, {
      seasons:        [...a.seasons],
      promoPct:       a.totalCount > 0 ? Math.round((a.promoCount / a.totalCount) * 100) : null,
      categories:     a.categories,
      uniqueProducts: a.eans.size,
    });
  }
  return result;
}

/**
 * Pobiera emaile z tabeli master_key (service_role) dla listy client_id.
 * Zwraca: { emailMap: Map<client_id, email>, missing: number }
 *
 * WAŻNE: Kolumna email w master_key została dodana migracją 038.
 * Historyczne rekordy (przed re-importem) mają email = NULL.
 * Emaile są uzupełniane przez ETL przy każdym imporcie zamówień.
 *
 * Dostęp wymaga service_role — nigdy nie eksponuj przez publiczne API.
 */
async function fetchEmails(sb, clientIds) {
  const emailMap = new Map();

  for (let i = 0; i < clientIds.length; i += EVENT_BATCH) {
    const batch = clientIds.slice(i, i + EVENT_BATCH);
    const { data, error } = await sb
      .from('master_key')
      .select('client_id,email')
      .in('client_id', batch)
      .not('email', 'is', null); // pobierz tylko rekordy z emailem — NULL = przed re-importem

    if (error) {
      // Kolumna email może nie istnieć jeszcze (przed migracją 038) — kontynuuj bez emaili
      console.error('[edrone-export] master_key fetch error:', error.message);
      continue;
    }
    for (const row of data ?? []) {
      if (row.email) emailMap.set(row.client_id, row.email);
    }
  }

  const missing = clientIds.length - emailMap.size;
  return { emailMap, missing };
}

/**
 * Loguje operację eksportu do vault_access_log.
 *
 * Schemat vault_access_log: (id, accessed_by uuid, client_id text NOT NULL,
 *   accessed_at timestamptz, reason text)
 *
 * Eksport masowy używa client_id = 'BULK_EXPORT' i accessed_by = null
 * (service_role bypass RLS — brak user context podczas eksportu server-side).
 */
async function logExport(sb, { count, filters, scope, missing }) {
  try {
    const reason = [
      `edrone_export`,
      `scope=${scope}`,
      `exported=${count}`,
      `missing_email=${missing}`,
      filters.segment  ? `segment=${filters.segment}`   : null,
      filters.risk     ? `risk=${filters.risk}`          : null,
      filters.world    ? `world=${filters.world}`        : null,
      filters.date_from ? `from=${filters.date_from}`    : null,
      filters.date_to   ? `to=${filters.date_to}`        : null,
    ].filter(Boolean).join(' ');

    await sb.from('vault_access_log').insert({
      accessed_by:  null,          // service_role bulk export — brak user context
      client_id:    'BULK_EXPORT', // wymagane NOT NULL — oznaczamy eksport masowy
      accessed_at:  new Date().toISOString(),
      reason,
    });
  } catch (e) {
    // Soft fail — nie przerywaj eksportu jeśli log się nie powiedzie
    console.warn('[edrone-export] vault_access_log insert failed:', e?.message);
  }
}

// ─── Generowanie CSV ──────────────────────────────────────────────────────────

/**
 * Buduje CSV w formacie wymaganym przez edrone Mission Control.
 * Kolumny: email, first_name, last_name, status, subscription_date, gender, tags
 *
 * Uwagi:
 *   - first_name / last_name / gender: puste (edrone wypełni z własnej bazy jeśli jest)
 *   - status: 1 = aktywny subskrybent
 *   - subscription_date: data pierwszego zakupu (YYYY-MM-DD HH:MM:SS)
 *   - tags: wszystkie tagi rozdzielone przecinkami (bez spacji)
 */
function buildCSV(clients, emailMap, eventAggMap) {
  const HEADER = 'email,first_name,last_name,status,subscription_date,gender,tags';
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines = [HEADER];
  let exported = 0;

  for (const client of clients) {
    const email = emailMap.get(client.client_id);
    if (!email) continue; // pomiń klientów bez emaila w master_key

    const events = eventAggMap.get(client.client_id) ?? {};
    const tags   = buildTags(client, events);

    // subscription_date: first_order jako YYYY-MM-DD HH:MM:SS (edrone wymaga tego formatu)
    const subDate = client.first_order
      ? client.first_order.slice(0, 10) + ' 00:00:00'
      : '';

    lines.push([
      escape(email),
      '',          // first_name
      '',          // last_name
      '1',         // status: aktywny
      escape(subDate),
      '',          // gender
      escape(tags.join(',')),
    ].join(','));

    exported++;
  }

  return { csv: lines.join('\n'), exported };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parametry filtrów
    const segment   = searchParams.get('segment')   || '';
    const risk      = searchParams.get('risk')       || '';
    const world     = searchParams.get('world')      || '';
    const date_from = searchParams.get('date_from')  || '';
    const date_to   = searchParams.get('date_to')    || '';
    const scope     = searchParams.get('scope') === 'winback' ? 'winback' : 'all';

    const filters = { segment, risk, world, date_from, date_to };
    const sb = getServiceClient(); // service_role — wymagany do odczytu master_key

    // 1. Pobierz klientów
    const clients = await fetchClients(sb, { ...filters, scope });
    if (clients.length === 0) {
      return new Response('email,first_name,last_name,status,subscription_date,gender,tags\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="edrone_export_${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    const clientIds = clients.map(c => c.client_id);

    // 2. Pobierz agregaty eventów + emaile równolegle
    const [eventAggMap, { emailMap, missing }] = await Promise.all([
      fetchEventAggregates(sb, clientIds),
      fetchEmails(sb, clientIds),
    ]);

    // 3. Zbuduj CSV
    const { csv, exported } = buildCSV(clients, emailMap, eventAggMap);

    // 4. Zaloguj eksport (async, nie blokuj odpowiedzi)
    logExport(sb, { count: exported, filters, scope, missing });

    // Ostrzeżenie w logach serwera jeśli brakuje emaili
    if (missing > 0) {
      console.warn(
        `[edrone-export] ${missing}/${clients.length} klientów bez emaila w master_key. ` +
        'Wymagany re-import ETL żeby uzupełnić kolumnę email (migracja 038).'
      );
    }

    const filename = `edrone_export_${new Date().toISOString().slice(0,10)}.csv`;
    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Count':      String(exported),
        'X-Missing-Emails':    String(missing), // ile klientów pominiętych (brak emaila)
      },
    });

  } catch (err) {
    console.error('[edrone-export] error:', err);
    return new Response(
      `error,${err instanceof Error ? err.message : 'Błąd serwera'}`,
      { status: 500, headers: { 'Content-Type': 'text/csv' } }
    );
  }
}
