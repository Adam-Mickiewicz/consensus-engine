import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const CONC = 10;

async function fetchAll(sb, params) {
  const { segment, risk, world, ltv_min, ltv_max, search, sort } = params;

  let countQ = sb.from('clients_360')
    .select('*', { count: 'exact', head: true });
  if (segment)  countQ = countQ.eq('legacy_segment', segment);
  if (risk)     countQ = countQ.eq('risk_level', risk);
  if (world)    countQ = countQ.eq('ulubiony_swiat', world);
  if (ltv_min)  countQ = countQ.gte('ltv', parseFloat(ltv_min));
  if (ltv_max)  countQ = countQ.lte('ltv', parseFloat(ltv_max));
  if (search)   countQ = countQ.ilike('client_id', `%${search}%`);

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
        .select('client_id,legacy_segment,risk_level,ltv,orders_count,last_order,first_order,ulubiony_swiat,winback_priority')
        .range(idx * PAGE, (idx + 1) * PAGE - 1);
      if (segment)  q = q.eq('legacy_segment', segment);
      if (risk)     q = q.eq('risk_level', risk);
      if (world)    q = q.eq('ulubiony_swiat', world);
      if (ltv_min)  q = q.gte('ltv', parseFloat(ltv_min));
      if (ltv_max)  q = q.lte('ltv', parseFloat(ltv_max));
      if (search)   q = q.ilike('client_id', `%${search}%`);
      switch (sort) {
        case 'ltv_asc':         q = q.order('ltv', { ascending: true }); break;
        case 'last_order_desc': q = q.order('last_order', { ascending: false }); break;
        case 'last_order_asc':  q = q.order('last_order', { ascending: true }); break;
        case 'orders_desc':     q = q.order('orders_count', { ascending: false }); break;
        default:                q = q.order('ltv', { ascending: false }); break;
      }
      promises.push(q);
    }
    const results = await Promise.all(promises);
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      if (data) rows = rows.concat(data);
    }
  }
  return rows;
}

function toCSV(rows) {
  const COLS = ['client_id', 'legacy_segment', 'risk_level', 'ltv', 'orders_count', 'last_order', 'first_order', 'ulubiony_swiat', 'winback_priority'];
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [COLS.join(',')];
  for (const r of rows) {
    lines.push(COLS.map(c => escape(r[c])).join(','));
  }
  return lines.join('\n');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      segment: searchParams.get('segment') || '',
      risk:    searchParams.get('risk') || '',
      world:   searchParams.get('world') || '',
      ltv_min: searchParams.get('ltv_min') || '',
      ltv_max: searchParams.get('ltv_max') || '',
      search:  searchParams.get('search') || '',
      sort:    searchParams.get('sort') || 'ltv_desc',
    };

    const sb = getServiceClient();
    const rows = await fetchAll(sb, params);
    const csv = toCSV(rows);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="klienci_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return new Response(`error,${err instanceof Error ? err.message : 'Błąd serwera'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/csv' },
    });
  }
}
