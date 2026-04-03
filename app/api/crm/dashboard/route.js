import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sb = getServiceClient();

  try {
    // Always use materialized views — fast, no timeouts.
    // Date filtering for revenue is done client-side.
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
    if (errors.length > 0) console.error('[crm/dashboard] errors:', errors);

    return Response.json({
      kpis: kpisRes.data || {},
      matrix: matrixRes.data || [],
      revenue: revenueRes.data || [],
      funnel: funnelRes.data || [],
      worlds: worldsRes.data || [],
      promo: promoRes.data || {},
      errors,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    console.error('[crm/dashboard] fatal:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
