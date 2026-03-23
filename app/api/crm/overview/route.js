import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const p_date_from = searchParams.get('date_from') || null;
    const p_date_to   = searchParams.get('date_to')   || null;
    const p_segment   = searchParams.get('segment')   || null;
    const p_risk      = searchParams.get('risk')      || null;
    const p_world     = searchParams.get('world')     || null;
    const p_occasion  = searchParams.get('occasion')  || null;

    const hasFilters = !!(p_date_from || p_date_to || p_segment || p_risk || p_world || p_occasion);

    const sb = getServiceClient();

    if (!hasFilters) {
      // Fast path: materialized views
      const [overviewRes, segmentsRes, riskRes, worldsRes] = await Promise.all([
        sb.from('crm_overview').select('*').single(),
        sb.from('crm_segments').select('*'),
        sb.from('crm_risk').select('*'),
        sb.from('crm_worlds').select('*').order('count', { ascending: false }).limit(10),
      ]);

      if (overviewRes.error || !overviewRes.data) {
        return NextResponse.json({ error: 'No data' }, { status: 404 });
      }

      return NextResponse.json({
        total_clients: Number(overviewRes.data.total_clients),
        total_ltv:     Number(overviewRes.data.total_ltv),
        avg_ltv:       Number(overviewRes.data.avg_ltv),
        vip_count:     Number(overviewRes.data.vip_count),
        segments:      (segmentsRes.data ?? []).map(r => ({
          legacy_segment: r.legacy_segment,
          count:   Number(r.count),
          sum_ltv: Number(r.sum_ltv),
          avg_ltv: Number(r.avg_ltv),
        })),
        risk:    (riskRes.data ?? []).map(r => ({
          risk_level: r.risk_level,
          count:      Number(r.count),
        })),
        worlds:  (worldsRes.data ?? []).map(r => ({
          ulubiony_swiat: r.ulubiony_swiat,
          count:          Number(r.count),
        })),
        filtered: false,
      });
    }

    // Filtered path: parameterized function
    const { data, error } = await sb.rpc('get_crm_overview', {
      p_date_from, p_date_to, p_segment, p_risk, p_world, p_occasion,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ...data, filtered: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
