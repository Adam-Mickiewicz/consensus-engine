import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  const sb = getServiceClient();

  try {
    if (dateFrom && dateTo) {
      // SQL functions filtering clients by last_order in range
      const [kpisRes, matrixRes, revenueRes, funnelRes, worldsRes, promoRes] = await Promise.all([
        sb.rpc('get_dashboard_kpis_for_range', { p_from: dateFrom, p_to: dateTo }),
        sb.rpc('get_segment_risk_for_range',   { p_from: dateFrom, p_to: dateTo }),
        sb.from('crm_revenue_monthly').select('*').order('month', { ascending: true }),
        sb.rpc('get_lifecycle_for_range',      { p_from: dateFrom, p_to: dateTo }),
        sb.rpc('get_worlds_clients_for_range', { p_from: dateFrom, p_to: dateTo }),
        sb.rpc('get_promo_share_for_range',    { p_from: dateFrom, p_to: dateTo }),
      ]);

      const errors = [kpisRes.error, matrixRes.error, revenueRes.error, funnelRes.error, worldsRes.error, promoRes.error]
        .filter(Boolean).map(e => e.message);
      if (errors.length) console.error('[crm/dashboard] range errors:', errors);

      return Response.json({
        kpis:    kpisRes.data  || {},
        matrix:  matrixRes.data  || [],
        revenue: revenueRes.data || [],
        funnel:  funnelRes.data  || [],
        worlds:  worldsRes.data  || [],
        promo:   promoRes.data   || {},
        dateRange: { from: dateFrom, to: dateTo },
        errors,
      }, { headers: { 'Cache-Control': 'private, max-age=30' } });
    }

    // Default — materialized views (fast, no date filter)
    const [kpisRes, matrixRes, revenueRes, funnelRes, worldsRes, promoRes] = await Promise.all([
      sb.from('crm_dashboard_kpis').select('*').single(),
      sb.from('crm_segment_risk_matrix').select('*'),
      sb.from('crm_revenue_monthly').select('*').order('month', { ascending: true }),
      sb.from('crm_lifecycle_funnel').select('*'),
      sb.from('crm_worlds_performance').select('*').limit(8),
      sb.from('crm_promo_share').select('*').single(),
    ]);

    const errors = [kpisRes.error, matrixRes.error, revenueRes.error, funnelRes.error, worldsRes.error, promoRes.error]
      .filter(Boolean).map(e => e.message);
    if (errors.length) console.error('[crm/dashboard] errors:', errors);

    return Response.json({
      kpis:    kpisRes.data  || {},
      matrix:  matrixRes.data  || [],
      revenue: revenueRes.data || [],
      funnel:  funnelRes.data  || [],
      worlds:  worldsRes.data  || [],
      promo:   promoRes.data   || {},
      errors,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    console.error('[crm/dashboard] fatal:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
