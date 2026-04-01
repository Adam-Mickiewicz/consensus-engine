import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sb = getServiceClient();
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const worldsQuery = (dateFrom && dateTo)
      ? sb.rpc('get_worlds_for_range', { p_from: dateFrom, p_to: dateTo })
      : sb.from('crm_worlds_performance').select('*');

    const [funnelRes, matrixRes, ladderRes, worldsRes] = await Promise.all([
      sb.from('crm_lifecycle_funnel').select('*'),
      sb.from('crm_segment_risk_matrix').select('*'),
      sb.from('crm_repeat_ladder').select('*'),
      worldsQuery,
    ]);

    const errors = [funnelRes.error, matrixRes.error, ladderRes.error, worldsRes.error]
      .filter(Boolean).map(e => e.message);
    if (errors.length) console.error('[crm/lifecycle]', errors);

    return Response.json({
      funnel: funnelRes.data || [],
      matrix: matrixRes.data || [],
      ladder: ladderRes.data || [],
      worlds: worldsRes.data || [],
      errors,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
