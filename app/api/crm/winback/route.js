import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const CONC = 10;

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function applyTierFilter(q, tier) {
  switch (tier) {
    case 'vip':      return q.in('legacy_segment', ['Diamond','Platinum']).in('risk_level', ['Lost','HighRisk']);
    case 'lost':     return q.eq('risk_level', 'Lost');
    case 'highrisk': return q.eq('risk_level', 'HighRisk');
    default:         return q.in('risk_level', ['Lost','HighRisk']);
  }
}

function applyFilters(q, { world, segment, date_from, date_to }) {
  if (world)     q = q.eq('top_domena', world);
  if (segment)   q = q.eq('legacy_segment', segment);
  if (date_from) q = q.gte('last_order', date_from);
  if (date_to)   q = q.lte('last_order', date_to);
  return q;
}

function applySort(q, sort) {
  switch (sort) {
    case 'ltv_asc':        return q.order('ltv', { ascending: true });
    case 'last_order_asc': return q.order('last_order', { ascending: true });
    default:               return q.order('ltv', { ascending: false });
  }
}

async function fetchAllStats(sb, tier, filters) {
  let countQ = sb.from('clients_360').select('*', { count: 'exact', head: true });
  countQ = applyTierFilter(countQ, tier);
  countQ = applyFilters(countQ, filters);
  const { count } = await countQ;
  const total = Math.min(count ?? 0, 10000);

  const pages = Math.ceil(total / PAGE);
  let rows = [];

  for (let b = 0; b < Math.ceil(pages / CONC); b++) {
    const promises = [];
    for (let i = 0; i < CONC; i++) {
      const idx = b * CONC + i;
      if (idx >= pages) break;
      let q = sb.from('clients_360')
        .select('ltv,last_order,legacy_segment,risk_level')
        .range(idx * PAGE, (idx + 1) * PAGE - 1);
      q = applyTierFilter(q, tier);
      q = applyFilters(q, filters);
      promises.push(q);
    }
    const results = await Promise.all(promises);
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      if (data) rows = rows.concat(data);
    }
  }

  const total_ltv = rows.reduce((s, r) => s + (Number(r.ltv) || 0), 0);
  const withDates = rows.filter(r => r.last_order);
  const avg_days_inactive = withDates.length > 0
    ? Math.round(withDates.reduce((s, r) => s + daysSince(r.last_order), 0) / withDates.length)
    : null;
  const vipRows   = rows.filter(r => ['Diamond','Platinum'].includes(r.legacy_segment) && ['Lost','HighRisk'].includes(r.risk_level));
  const vip_count = vipRows.length;
  const vip_ltv   = vipRows.reduce((s, r) => s + (Number(r.ltv) || 0), 0);

  return { total: count ?? 0, total_ltv, avg_days_inactive, vip_count, vip_ltv };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tier     = searchParams.get('tier')      || 'vip';
    const world    = searchParams.get('world')     || '';
    const segment  = searchParams.get('segment')   || '';
    const date_from = searchParams.get('date_from') || '';
    const date_to  = searchParams.get('date_to')   || '';
    const sort     = searchParams.get('sort')      || 'ltv_desc';
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const per_page = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') || '50') || 50));
    const offset   = (page - 1) * per_page;

    const filters = { world, segment, date_from, date_to };
    const sb = getServiceClient();

    let clientsQ = sb.from('clients_360')
      .select('client_id,legacy_segment,risk_level,ltv,orders_count,last_order,top_domena,winback_priority', { count: 'exact' });
    clientsQ = applyTierFilter(clientsQ, tier);
    clientsQ = applyFilters(clientsQ, filters);
    clientsQ = applySort(clientsQ, sort);
    clientsQ = clientsQ.range(offset, offset + per_page - 1);

    const [clientsRes, worldsRes, statsData] = await Promise.all([
      clientsQ,
      sb.from('clients_360').select('top_domena').not('top_domena', 'is', null).limit(200),
      fetchAllStats(sb, tier, filters),
    ]);

    if (clientsRes.error) throw new Error(clientsRes.error.message);

    const clients = (clientsRes.data ?? []).map(c => ({
      ...c,
      days_since_last_order: daysSince(c.last_order),
    }));

    let worlds = [];
    if (!worldsRes.error && worldsRes.data) {
      worlds = [...new Set(worldsRes.data.map(r => r.top_domena).filter(Boolean))].sort();
    }

    return NextResponse.json({
      clients,
      stats: {
        total:             statsData.total,
        total_ltv:         parseFloat(statsData.total_ltv.toFixed(2)),
        avg_days_inactive: statsData.avg_days_inactive,
        vip_count:         statsData.vip_count,
        vip_ltv:           parseFloat(statsData.vip_ltv.toFixed(2)),
      },
      total:       clientsRes.count ?? 0,
      page,
      total_pages: Math.ceil((clientsRes.count ?? 0) / per_page),
      worlds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
