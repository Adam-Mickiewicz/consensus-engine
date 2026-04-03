import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const opportunitiesQuery = (dateFrom && dateTo)
      ? supabase.rpc('get_opportunities_for_range', { p_from: dateFrom, p_to: dateTo })
      : supabase.from('crm_opportunity_queue').select('*').order('sort_order', { ascending: true });

    const { data: opportunities, error: e1 } = await opportunitiesQuery;

    let segmentClients = null;
    if (segment) {
      let query = supabase
        .from('clients_360')
        .select('client_id, legacy_segment, risk_level, ltv, orders_count, last_order, top_domena, winback_priority');

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

      const { data } = await query.order('ltv', { ascending: false }).limit(200);
      segmentClients = data;
    }

    return Response.json({
      opportunities: opportunities || [],
      segmentClients,
      errors: [e1].filter(Boolean).map((e) => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
