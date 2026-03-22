import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAGE = 1000;
const CONC = 10;

function daysSince(dateStr) {
  if (!dateStr) return '';
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function applyTierFilter(q, tier) {
  switch (tier) {
    case 'vip':      return q.in('legacy_segment', ['Diamond', 'Platinum']).in('risk_level', ['Lost', 'HighRisk']);
    case 'lost':     return q.eq('risk_level', 'Lost');
    case 'highrisk': return q.eq('risk_level', 'HighRisk');
    default:         return q.in('risk_level', ['Lost', 'HighRisk']);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tier  = searchParams.get('tier') || 'vip';
    const world = searchParams.get('world') || '';
    const sort  = searchParams.get('sort') || 'ltv_desc';

    const sb = getServiceClient();

    let countQ = sb.from('clients_360').select('*', { count: 'exact', head: true });
    countQ = applyTierFilter(countQ, tier);
    if (world) countQ = countQ.eq('ulubiony_swiat', world);
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
          .select('client_id,legacy_segment,risk_level,ltv,orders_count,last_order,ulubiony_swiat')
          .range(idx * PAGE, (idx + 1) * PAGE - 1);
        q = applyTierFilter(q, tier);
        if (world) q = q.eq('ulubiony_swiat', world);
        switch (sort) {
          case 'ltv_asc':        q = q.order('ltv', { ascending: true }); break;
          case 'last_order_asc': q = q.order('last_order', { ascending: true }); break;
          default:               q = q.order('ltv', { ascending: false }); break;
        }
        promises.push(q);
      }
      const results = await Promise.all(promises);
      for (const { data, error } of results) {
        if (error) throw new Error(error.message);
        if (data) rows = rows.concat(data);
      }
    }

    const COLS = ['client_id', 'legacy_segment', 'risk_level', 'ltv', 'orders_count', 'last_order', 'days_since_last_order', 'ulubiony_swiat'];
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [COLS.join(',')];
    for (const r of rows) {
      lines.push([
        escape(r.client_id),
        escape(r.legacy_segment),
        escape(r.risk_level),
        escape(r.ltv),
        escape(r.orders_count),
        escape(r.last_order ? r.last_order.slice(0, 10) : ''),
        escape(daysSince(r.last_order)),
        escape(r.ulubiony_swiat),
      ].join(','));
    }

    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="winback_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return new Response(`error,${err instanceof Error ? err.message : 'Błąd serwera'}`, {
      status: 500,
      headers: { 'Content-Type': 'text/csv' },
    });
  }
}
