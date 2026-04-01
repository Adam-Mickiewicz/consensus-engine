import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('clients_360')
      .select('client_id, ltv, orders_count, risk_level, top_domena, first_order, last_order')
      .eq('legacy_segment', 'Diamond')
      .order('ltv', { ascending: false })
      .limit(10);

    if (error) throw new Error(error.message);
    return NextResponse.json({ rows: data ?? [] }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    console.error('[top-diamonds]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
