import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function daysSince(dateStr) {
  if (!dateStr) return '';
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment') || 'all';

    let query = supabase
      .from('clients_360')
      .select('client_id, legacy_segment, risk_level, ltv, orders_count, last_order, top_domena');

    switch (segment) {
      case 'vip_reactivation':
        query = query.in('legacy_segment', ['Diamond', 'Platinum']).in('risk_level', ['Lost', 'HighRisk']);
        break;
      case 'second_order':
        query = query
          .eq('orders_count', 1)
          .gt('last_order', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .lt('last_order', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        break;
      case 'falling_frequency':
        query = query.in('legacy_segment', ['Platinum', 'Gold']).eq('risk_level', 'Risk');
        break;
      case 'returning_at_risk':
        query = query.eq('legacy_segment', 'Returning').in('risk_level', ['Risk', 'HighRisk']);
        break;
      case 'dormant_loyals':
        query = query
          .gte('orders_count', 5)
          .lt('last_order', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());
        break;
      case 'recent_high_value':
        query = query
          .gt('last_order', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .gt('ltv', 1000);
        break;
    }

    const { data, error } = await query.order('ltv', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const header = 'client_id,legacy_segment,risk_level,ltv,orders_count,last_order,days_since_last_order,top_domena\n';
    const body = rows
      .map((r) =>
        [
          r.client_id,
          r.legacy_segment || '',
          r.risk_level || '',
          r.ltv?.toFixed(2) || '0',
          r.orders_count || '0',
          r.last_order ? r.last_order.slice(0, 10) : '',
          daysSince(r.last_order),
          r.top_domena || '',
        ].join(',')
      )
      .join('\n');

    return new Response(header + body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="crm_${segment}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
