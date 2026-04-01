import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sb = getServiceClient();
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let retentionQuery = sb.from('crm_cohort_retention').select('*').order('cohort_month', { ascending: true });
    if (dateFrom) retentionQuery = retentionQuery.gte('cohort_month', dateFrom);
    if (dateTo) retentionQuery = retentionQuery.lte('cohort_month', dateTo);

    const [retentionRes, timeRes, contextRes] = await Promise.all([
      retentionQuery,
      sb.from('crm_time_to_second_order').select('*'),
      sb.from('crm_cohort_by_context').select('*'),
    ]);

    const errors = [retentionRes.error, timeRes.error, contextRes.error]
      .filter(Boolean).map(e => e.message);
    if (errors.length) console.error('[crm/cohorts]', errors);

    return Response.json({
      retention: retentionRes.data || [],
      timeToSecond: timeRes.data || [],
      byContext: contextRes.data || [],
      errors,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
