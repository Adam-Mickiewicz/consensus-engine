import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();

    const [worldsRes, occasionsRes] = await Promise.all([
      sb.from('crm_worlds').select('ulubiony_swiat').limit(30),
      sb.from('crm_occasion_ltv').select('occasion').limit(50),
    ]);

    const worlds = (worldsRes.data ?? [])
      .map(r => r.ulubiony_swiat)
      .filter(Boolean)
      .sort();

    const occasions = (occasionsRes.data ?? [])
      .map(r => r.occasion)
      .filter(Boolean)
      .sort();

    return NextResponse.json({ worlds, occasions });
  } catch (err) {
    return NextResponse.json({ worlds: [], occasions: [] });
  }
}
