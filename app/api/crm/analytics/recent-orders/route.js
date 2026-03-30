import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('client_product_events')
      .select('client_id, product_name, order_date, line_total, season')
      .order('order_date', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    // Enrich with client segment
    const clientIds = [...new Set((data ?? []).map(r => r.client_id))];
    let clientMap = {};
    if (clientIds.length) {
      const { data: clients } = await sb
        .from('clients_360')
        .select('client_id, legacy_segment, risk_level')
        .in('client_id', clientIds);
      for (const c of clients ?? []) clientMap[c.client_id] = c;
    }

    const rows = (data ?? []).map(r => ({
      ...r,
      legacy_segment: clientMap[r.client_id]?.legacy_segment ?? null,
      risk_level:     clientMap[r.client_id]?.risk_level ?? null,
    }));

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('[recent-orders]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
