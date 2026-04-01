import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();

    const [worldsRes, occasionsRes] = await Promise.all([
      sb.from('clients_360').select('top_domena').not('top_domena', 'is', null).limit(200),
      sb.from('crm_occasion_ltv').select('occasion').limit(50),
    ]);

    const worlds = [...new Set((worldsRes.data ?? [])
      .map(r => r.top_domena)
      .filter(Boolean))]
      .sort();

    const occasions = (occasionsRes.data ?? [])
      .map(r => r.occasion)
      .filter(Boolean)
      .sort();

    return NextResponse.json({ worlds, occasions }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return NextResponse.json({ worlds: [], occasions: [] });
  }
}
