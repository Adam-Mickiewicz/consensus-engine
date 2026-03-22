import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isoWeekKey(d) {
  const tmp = new Date(d.getTime());
  const dow = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function getKey(dateStr, gran) {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d)) return null;
  const yr = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const moS = String(mo).padStart(2, '0');
  const dayS = String(d.getUTCDate()).padStart(2, '0');
  switch (gran) {
    case 'daily':     return `${yr}-${moS}-${dayS}`;
    case 'weekly':    return isoWeekKey(d);
    case 'quarterly': return `${yr}-Q${Math.ceil(mo / 3)}`;
    case 'yearly':    return String(yr);
    default:          return `${yr}-${moS}`;
  }
}

async function fetchAllConcurrent(sb, table, columns, total) {
  const PAGE = 1000, CONC = 10;
  const pages = Math.ceil(total / PAGE);
  let rows = [];
  for (let b = 0; b < Math.ceil(pages / CONC); b++) {
    const ps = [];
    for (let i = 0; i < CONC; i++) {
      const idx = b * CONC + i;
      if (idx >= pages) break;
      ps.push(sb.from(table).select(columns).range(idx * PAGE, (idx + 1) * PAGE - 1));
    }
    const res = await Promise.all(ps);
    for (const { data, error } of res) {
      if (error) throw new Error(`${table}: ${error.message}`);
      if (data) rows = rows.concat(data);
    }
  }
  return rows;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gran = searchParams.get('gran') || 'monthly';
    const sb = getServiceClient();

    const [evRes, clRes] = await Promise.all([
      sb.from('client_product_events').select('*', { count: 'exact', head: true }),
      sb.from('clients_360').select('*', { count: 'exact', head: true }),
    ]);

    const [allEvents, allClients] = await Promise.all([
      fetchAllConcurrent(sb, 'client_product_events', 'client_id,order_date,ean', evRes.count ?? 0),
      fetchAllConcurrent(sb, 'clients_360', 'client_id,last_order,ltv', clRes.count ?? 0),
    ]);

    // Aggregate events
    const evMap = {};
    for (const r of allEvents) {
      const k = getKey(r.order_date, gran);
      if (!k) continue;
      if (!evMap[k]) evMap[k] = { okres: k, clients: new Set(), eventy: 0, null_ean: 0 };
      evMap[k].eventy++;
      if (r.client_id) evMap[k].clients.add(r.client_id);
      if (r.ean == null || r.ean === '') evMap[k].null_ean++;
    }
    const events_by_month = Object.values(evMap)
      .sort((a, b) => a.okres.localeCompare(b.okres))
      .map(r => ({
        okres: r.okres,
        klienci: r.clients.size,
        eventy: r.eventy,
        null_ean: r.null_ean,
        pct_null_ean: r.eventy > 0 ? parseFloat((r.null_ean / r.eventy * 100).toFixed(1)) : 0,
      }));

    // Aggregate LTV by last_order period
    const ltvMap = {};
    for (const r of allClients) {
      if (!r.last_order) continue;
      const k = getKey(r.last_order, gran);
      if (!k) continue;
      if (!ltvMap[k]) ltvMap[k] = { okres: k, klienci: 0, ltv_suma: 0 };
      ltvMap[k].klienci++;
      ltvMap[k].ltv_suma += parseFloat(r.ltv ?? 0) || 0;
    }
    const ltv_by_month = Object.values(ltvMap)
      .sort((a, b) => a.okres.localeCompare(b.okres))
      .map(r => ({
        okres: r.okres,
        klienci: r.klienci,
        ltv_suma: parseFloat(r.ltv_suma.toFixed(2)),
        ltv_avg: r.klienci > 0 ? parseFloat((r.ltv_suma / r.klienci).toFixed(2)) : 0,
      }));

    return NextResponse.json({ events_by_month, ltv_by_month, gran });
  } catch (err) {
    console.error('[ltv-timeline]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
