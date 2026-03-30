import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();

    // Monthly revenue aggregation from client_product_events — last 18 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 17);
    cutoff.setDate(1);

    const { data, error } = await sb
      .from('client_product_events')
      .select('order_date, line_total, client_id')
      .gte('order_date', cutoff.toISOString())
      .not('line_total', 'is', null);

    if (error) throw new Error(error.message);

    // Aggregate by month
    const byMonth = {};
    const clientsByMonth = {};
    for (const r of data ?? []) {
      const month = r.order_date?.slice(0, 7); // 'YYYY-MM'
      if (!month) continue;
      if (!byMonth[month]) { byMonth[month] = 0; clientsByMonth[month] = new Set(); }
      byMonth[month] += Number(r.line_total || 0);
      clientsByMonth[month].add(r.client_id);
    }

    const months = Object.keys(byMonth).sort();
    const rows = months.map(month => ({
      month,
      revenue:  Math.round(byMonth[month]),
      orders:   clientsByMonth[month].size,
    }));

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('[revenue-trend]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
