import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function fetchAllConcurrent(sb, table, columns, totalCount) {
  const PAGE = 1000;
  const CONCURRENT = 10;
  const pages = Math.ceil(totalCount / PAGE);
  let rows = [];

  for (let batch = 0; batch < Math.ceil(pages / CONCURRENT); batch++) {
    const promises = [];
    for (let i = 0; i < CONCURRENT; i++) {
      const pageIdx = batch * CONCURRENT + i;
      if (pageIdx >= pages) break;
      promises.push(
        sb.from(table).select(columns).range(pageIdx * PAGE, (pageIdx + 1) * PAGE - 1)
      );
    }
    const results = await Promise.all(promises);
    for (const { data, error } of results) {
      if (error) throw new Error(`${table}: ${error.message}`);
      if (data) rows = rows.concat(data);
    }
  }
  return rows;
}

function monthsBetween(minDate, maxDate) {
  if (!minDate || !maxDate) return [];
  const months = [];
  const start = new Date(minDate.slice(0, 7) + '-01T00:00:00Z');
  const end = new Date(maxDate.slice(0, 7) + '-01T00:00:00Z');
  let curr = new Date(start);
  while (curr <= end) {
    months.push(curr.toISOString().slice(0, 7));
    curr.setUTCMonth(curr.getUTCMonth() + 1);
  }
  return months;
}

export async function GET() {
  try {
    const sb = getServiceClient();

    // Phase 1: wszystkie szybkie zapytania równolegle
    const [
      totalCountRes,
      minRes,
      maxRes,
      nullClientRes,
      nullDateRes,
      nullEanRes,
      clients360Res,
      unmappedRes,
      segmentsRes,
    ] = await Promise.all([
      sb.from('client_product_events').select('*', { count: 'exact', head: true }),
      sb.from('client_product_events').select('order_date').order('order_date').limit(1),
      sb.from('client_product_events').select('order_date').order('order_date', { ascending: false }).limit(1),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }).is('client_id', null),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }).is('order_date', null),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }).is('ean', null),
      sb.from('clients_360').select('*', { count: 'exact', head: true }),
      sb.from('unmapped_products').select('purchase_count').range(0, 9999),
      sb.from('crm_segments').select('legacy_segment,count,sum_ltv,avg_ltv').order('count', { ascending: false }),
    ]);

    const totalEvents  = totalCountRes.count ?? 0;
    const minDate      = minRes.data?.[0]?.order_date ?? null;
    const maxDate      = maxRes.data?.[0]?.order_date ?? null;
    const nullClient   = nullClientRes.count ?? 0;
    const nullDate     = nullDateRes.count ?? 0;
    const nullEan      = nullEanRes.count ?? 0;
    const total360     = clients360Res.count ?? 0;
    const unmappedRows = unmappedRes.data ?? [];
    const unmappedCount     = unmappedRows.length;
    const unmappedPurchases = unmappedRows.reduce((s, r) => s + (Number(r.purchase_count) || 0), 0);
    const segments = segmentsRes.data ?? [];

    // Phase 2: pełne pobieranie eventów (współbieżne) dla złożonych checków
    const allEvents = await fetchAllConcurrent(sb, 'client_product_events', 'client_id,order_date,ean', totalEvents);

    // Phase 3: agregacje JS
    const distinctClients = new Set();
    const byMonth = {};
    const dupeMap = {};

    for (const r of allEvents) {
      if (r.client_id) distinctClients.add(r.client_id);

      if (r.order_date) {
        const m = r.order_date.slice(0, 7);
        byMonth[m] = (byMonth[m] || 0) + 1;
      }

      const key = (r.client_id || 'NULL') + '|' + (r.ean != null ? r.ean : 'NULL') + '|' + (r.order_date || 'NULL');
      dupeMap[key] = (dupeMap[key] || 0) + 1;
    }

    const distinctClientsCount = distinctClients.size;
    const dupeGroups = Object.values(dupeMap).filter(c => c > 1).length;

    const months = monthsBetween(minDate, maxDate);
    const monthData = months.map(m => ({ month: m, count: byMonth[m] || 0 }));
    const holesZero   = monthData.filter(m => m.count === 0).length;
    const holesSparse = monthData.filter(m => m.count > 0 && m.count < 10).length;

    // Buduj checks
    const checks = [];

    // 1. Overview
    checks.push({
      id: 'overview',
      label: 'Przegląd ogólny',
      status: 'ok',
      message: `${totalEvents.toLocaleString('pl-PL')} eventów · ${distinctClientsCount.toLocaleString('pl-PL')} unikalnych klientów · zakres: ${minDate?.slice(0, 10)} → ${maxDate?.slice(0, 10)}`,
      data: { totalEvents, distinctClients: distinctClientsCount, minDate: minDate?.slice(0, 10), maxDate: maxDate?.slice(0, 10) },
    });

    // 2. Ciągłość czasowa
    const holesStatus = holesZero > 0 ? 'danger' : holesSparse > 0 ? 'warn' : 'ok';
    checks.push({
      id: 'holes',
      label: 'Ciągłość czasowa',
      status: holesStatus,
      message: holesZero > 0
        ? `${holesZero} miesięcy z 0 eventami · ${holesSparse} miesięcy z <10 eventami`
        : holesSparse > 0
        ? `${holesSparse} miesięcy z bardzo małą liczbą eventów (<10)`
        : `Brak dziur — ${months.length} miesięcy z danymi`,
      data: { months: monthData, holesZero, holesSparse },
    });

    // 3. Duplikaty
    const dupeStatus = dupeGroups >= 100 ? 'danger' : dupeGroups > 0 ? 'warn' : 'ok';
    checks.push({
      id: 'duplicates',
      label: 'Duplikaty',
      status: dupeStatus,
      message: dupeGroups === 0
        ? 'Brak duplikatów (client_id, ean, order_date)'
        : `${dupeGroups.toLocaleString('pl-PL')} grup duplikatów (${dupeGroups >= 100 ? 'krytyczne' : 'ostrzeżenie'})`,
      data: { dupeGroups },
    });

    // 4. NULLe
    const eanNullPct = totalEvents > 0 ? (nullEan / totalEvents) * 100 : 0;
    const nullStatus = nullClient > 0 || nullDate > 0
      ? 'danger'
      : eanNullPct >= 20 ? 'danger' : eanNullPct > 0 ? 'warn' : 'ok';
    checks.push({
      id: 'nulls',
      label: 'Brakujące dane (NULL)',
      status: nullStatus,
      message: nullClient > 0 || nullDate > 0
        ? `KRYTYCZNE: ${nullClient} null client_id · ${nullDate} null order_date`
        : nullEan > 0
        ? `${nullEan.toLocaleString('pl-PL')} null EAN (${eanNullPct.toFixed(1)}% eventów)`
        : 'Brak wartości NULL w kluczowych kolumnach',
      data: { nullClient, nullDate, nullEan, eanNullPct: eanNullPct.toFixed(1) },
    });

    // 5. Spójność
    const clientsWithoutEvents = total360 - distinctClientsCount;
    const diff = Math.abs(clientsWithoutEvents);
    const consistencyStatus = diff >= 1000 ? 'danger' : diff >= 100 ? 'warn' : 'ok';
    checks.push({
      id: 'consistency',
      label: 'Spójność klientów',
      status: consistencyStatus,
      message: `clients_360: ${total360.toLocaleString('pl-PL')} · z eventami: ${distinctClientsCount.toLocaleString('pl-PL')} · bez eventów: ${clientsWithoutEvents.toLocaleString('pl-PL')}`,
      data: { total360, distinctInEvents: distinctClientsCount, withoutEvents: clientsWithoutEvents, eventsWithoutProfile: nullClient },
    });

    // 6. Unmapped
    const unmappedStatus = unmappedCount >= 50 ? 'danger' : unmappedCount > 0 ? 'warn' : 'ok';
    checks.push({
      id: 'unmapped',
      label: 'Produkty bez mapowania EAN',
      status: unmappedStatus,
      message: unmappedCount === 0
        ? 'Wszystkie produkty mają przypisany EAN'
        : `${unmappedCount.toLocaleString('pl-PL')} unikalnych nazw bez EAN · ${unmappedPurchases.toLocaleString('pl-PL')} zakupów bez taksonomii`,
      data: { unmappedCount, unmappedPurchases },
    });

    // 7. Segmenty
    const totalSegmented = segments.reduce((s, r) => s + (parseInt(r.count) || 0), 0);
    const diamond = segments.find(s => s.legacy_segment === 'Diamond');
    const diamondPct = totalSegmented > 0 && diamond ? (parseInt(diamond.count) / totalSegmented) * 100 : 0;
    const segStatus = diamondPct > 5 ? 'warn' : 'ok';
    checks.push({
      id: 'segments',
      label: 'Segmenty klientów',
      status: segStatus,
      message: segStatus === 'warn'
        ? `Diamond stanowi ${diamondPct.toFixed(1)}% klientów (próg: 5%)`
        : `${segments.length} segmentów · ${totalSegmented.toLocaleString('pl-PL')} klientów`,
      data: {
        segments: segments.map(s => ({
          ...s,
          pct: totalSegmented > 0 ? ((parseInt(s.count) / totalSegmented) * 100).toFixed(1) : '0',
        })),
      },
    });

    // 8. Historia importów
    const { data: syncRuns, error: syncErr } = await sb
      .from('sync_log')
      .select('id,source,status,rows_upserted,triggered_at,meta,error_message')
      .eq('source', 'csv_upload')
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (!syncErr && syncRuns) {
      const runs = syncRuns.map(r => ({
        id: r.id,
        status: r.status,
        rows_upserted: r.rows_upserted ?? 0,
        triggered_at: r.triggered_at,
        error_message: r.error_message ?? null,
        filename: r.meta?.file ?? r.meta?.filename ?? r.meta?.file_name ?? null,
        clients_count: r.meta?.clients_upserted ?? r.meta?.clients ?? null,
        unmapped_count: r.meta?.unmapped ?? null,
      }));

      const validRuns = runs.filter(r => r.rows_upserted > 0);
      const avg_rows     = validRuns.length > 0 ? validRuns.reduce((s, r) => s + r.rows_upserted, 0) / validRuns.length : 0;
      const unmappedRuns = runs.filter(r => r.unmapped_count != null);
      const avg_unmapped = unmappedRuns.length > 0 ? unmappedRuns.reduce((s, r) => s + (r.unmapped_count ?? 0), 0) / unmappedRuns.length : 0;

      const anomalies = runs
        .filter(r => (avg_unmapped > 0 && (r.unmapped_count ?? 0) > avg_unmapped * 3) || (avg_rows > 0 && r.rows_upserted < avg_rows * 0.1))
        .map(r => r.id);

      const histStatus = anomalies.length === 0 ? 'ok' : anomalies.length <= 2 ? 'warn' : 'danger';
      checks.push({
        id: 'import_history',
        label: 'Historia importów & jakość plików',
        status: histStatus,
        message: anomalies.length === 0
          ? `${runs.length} importów CSV · śr. ${Math.round(avg_rows).toLocaleString('pl-PL')} wierszy/run · śr. ${Math.round(avg_unmapped).toLocaleString('pl-PL')} unmapped/run`
          : `${anomalies.length} anomalii (${anomalies.length <= 2 ? 'ostrzeżenie' : 'krytyczne'}) · ${runs.length} runów łącznie`,
        data: { runs, avg_rows: Math.round(avg_rows), avg_unmapped: Math.round(avg_unmapped), anomalies },
      });
    }

    // 9. Jakość EAN per miesiąc — fetch all events (already have allEvents)
    const eanByMonth = {};
    for (const r of allEvents) {
      if (!r.order_date) continue;
      const m = r.order_date.slice(0, 7);
      if (!eanByMonth[m]) eanByMonth[m] = { eventy: 0, klienci: new Set(), null_ean: 0 };
      eanByMonth[m].eventy++;
      if (r.client_id) eanByMonth[m].klienci.add(r.client_id);
      if (r.ean == null || r.ean === '') eanByMonth[m].null_ean++;
    }
    const eanMonths = Object.keys(eanByMonth).sort().map(m => ({
      month: m,
      eventy: eanByMonth[m].eventy,
      klienci: eanByMonth[m].klienci.size,
      null_ean: eanByMonth[m].null_ean,
      pct_null_ean: parseFloat((eanByMonth[m].null_ean * 100 / eanByMonth[m].eventy).toFixed(1)),
    }));

    const maxEanPct = eanMonths.reduce((mx, m) => Math.max(mx, m.pct_null_ean), 0);
    const eanStatus = maxEanPct > 50 ? 'danger' : maxEanPct > 15 ? 'warn' : 'ok';
    const badMonths = eanMonths.filter(m => m.pct_null_ean > 15).length;
    checks.push({
      id: 'monthly_ean_quality',
      label: 'Jakość EAN per miesiąc',
      status: eanStatus,
      message: eanStatus === 'ok'
        ? `Wszystkie miesiące poniżej 15% null EAN`
        : `${badMonths} miesięcy z >15% null EAN · maks: ${maxEanPct.toFixed(1)}%`,
      data: { eanMonths },
    });

    return NextResponse.json({ checks, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[audit] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
