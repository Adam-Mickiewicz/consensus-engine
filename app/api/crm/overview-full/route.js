import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();

    const [overviewRes, segmentsRes, riskRes, domainsRes] = await Promise.all([
      sb.from('crm_overview').select('*').single(),
      sb.from('crm_segments').select('*'),
      sb.from('crm_risk').select('*'),
      sb.from('crm_tag_stats')
        .select('tag, client_count')
        .eq('tag_type', 'domenowe')
        .order('client_count', { ascending: false })
        .limit(10),
    ]);

    if (overviewRes.error || !overviewRes.data) {
      return NextResponse.json({ error: 'No data' }, { status: 404 });
    }

    const ov = overviewRes.data;
    const totalCustomers = Number(ov.total_clients);
    const totalLtv       = Math.round(Number(ov.total_ltv));
    const avgLtv         = Math.round(Number(ov.avg_ltv));
    const vipReanimacja  = Number(ov.vip_count);

    const segOrder = ['Diamond', 'Platinum', 'Gold', 'Returning', 'New'];
    const segRaw   = segmentsRes.data ?? [];
    const bySegment = segOrder.map(s => {
      const row = segRaw.find(r => r.legacy_segment === s);
      if (!row) return null;
      const count = Number(row.count);
      return {
        segment: s,
        count,
        sumLtv: Math.round(Number(row.sum_ltv)),
        avgLtv: Math.round(Number(row.avg_ltv)),
        pct:    Math.round((count / totalCustomers) * 100),
      };
    }).filter(Boolean);

    const riskOrder = ['OK', 'Risk', 'HighRisk', 'Lost'];
    const riskRaw   = riskRes.data ?? [];
    const byRisk = riskOrder.map(r => {
      const row = riskRaw.find(x => x.risk_level === r);
      if (!row) return null;
      const count = Number(row.count);
      return { risk_level: r, count, pct: Math.round((count / totalCustomers) * 100) };
    }).filter(Boolean);

    const topDomains = (domainsRes.data ?? []).map(r => ({
      domain: r.tag,
      count:  Number(r.client_count),
    }));

    return NextResponse.json({
      totalCustomers, totalLtv, avgLtv, vipReanimacja,
      bySegment, byRisk, topDomains,
    });
  } catch (err) {
    console.error('[overview-full]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
