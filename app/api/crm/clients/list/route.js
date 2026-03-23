import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

function buildQuery(sb, params) {
  const { segment, risk, world, ltv_min, ltv_max, search, sort, date_from, date_to } = params;

  let q = sb.from('clients_360').select(
    'client_id,legacy_segment,risk_level,ltv,orders_count,last_order,first_order,ulubiony_swiat,winback_priority',
    { count: 'exact' }
  );

  if (segment)   q = q.eq('legacy_segment', segment);
  if (risk)      q = q.eq('risk_level', risk);
  if (world)     q = q.eq('ulubiony_swiat', world);
  if (ltv_min)   q = q.gte('ltv', parseFloat(ltv_min));
  if (ltv_max)   q = q.lte('ltv', parseFloat(ltv_max));
  if (search)    q = q.ilike('client_id', `%${search}%`);
  if (date_from) q = q.gte('last_order', date_from);
  if (date_to)   q = q.lte('last_order', date_to);

  switch (sort) {
    case 'ltv_asc':         q = q.order('ltv',         { ascending: true  }); break;
    case 'last_order_desc': q = q.order('last_order',  { ascending: false }); break;
    case 'last_order_asc':  q = q.order('last_order',  { ascending: true  }); break;
    case 'orders_desc':     q = q.order('orders_count',{ ascending: false }); break;
    case 'orders_asc':      q = q.order('orders_count',{ ascending: true  }); break;
    case 'first_order_desc':q = q.order('first_order', { ascending: false }); break;
    default:                q = q.order('ltv',         { ascending: false }); break;
  }
  return q;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      segment:   searchParams.get('segment')   || '',
      risk:      searchParams.get('risk')       || '',
      world:     searchParams.get('world')      || '',
      ltv_min:   searchParams.get('ltv_min')    || '',
      ltv_max:   searchParams.get('ltv_max')    || '',
      search:    searchParams.get('search')     || '',
      sort:      searchParams.get('sort')       || 'ltv_desc',
      date_from: searchParams.get('date_from')  || '',
      date_to:   searchParams.get('date_to')    || '',
    };
    const occasion  = searchParams.get('occasion') || '';
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const per_page  = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') || '50') || 50));
    const offset    = (page - 1) * per_page;

    const sb = getServiceClient();

    // If occasion filter is set, resolve matching client IDs first
    let occasionIds = null;
    if (occasion) {
      const { data: evRows } = await sb
        .from('client_product_events')
        .select('client_id')
        .eq('season', occasion)
        .limit(5000);
      occasionIds = [...new Set((evRows ?? []).map(r => r.client_id))];
      if (occasionIds.length === 0) {
        return NextResponse.json({ clients: [], total: 0, page, per_page, total_pages: 0, worlds: [] });
      }
    }

    let q = buildQuery(sb, params);
    if (occasionIds) q = q.in('client_id', occasionIds);
    q = q.range(offset, offset + per_page - 1);

    const [clientsRes, worldsRes] = await Promise.all([
      q,
      sb.from('crm_worlds').select('*').limit(25),
    ]);

    if (clientsRes.error) throw new Error(clientsRes.error.message);

    const total = clientsRes.count ?? 0;

    let worlds = [];
    if (!worldsRes.error && worldsRes.data) {
      worlds = worldsRes.data
        .map(r => r.ulubiony_swiat ?? r.swiat ?? r.world ?? Object.values(r).find(v => typeof v === 'string'))
        .filter(Boolean);
    }

    return NextResponse.json({
      clients: clientsRes.data ?? [],
      total,
      page,
      per_page,
      total_pages: Math.ceil(total / per_page),
      worlds,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
