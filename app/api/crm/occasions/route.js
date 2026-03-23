import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const sb = getServiceClient();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    if (view === 'loyal') {
      const { data, error, count } = await sb
        .from('crm_occasion_loyal')
        .select('*', { count: 'exact' })
        .order('years_active', { ascending: false })
        .order('total_ltv',    { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    if (view === 'drift') {
      const { data, error, count } = await sb
        .from('crm_occasion_drift')
        .select('*', { count: 'exact' })
        .order('occasion_count', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    // Default: overview data
    const [retentionRes, firstRes, ltvRes] = await Promise.all([
      sb.from('crm_occasion_retention').select('*'),
      sb.from('crm_occasion_first').select('*').order('new_clients', { ascending: false }),
      sb.from('crm_occasion_ltv').select('*').order('avg_client_ltv', { ascending: false }),
    ]);

    if (retentionRes.error) throw new Error(retentionRes.error.message);
    if (firstRes.error)     throw new Error(firstRes.error.message);
    if (ltvRes.error)       throw new Error(ltvRes.error.message);

    return NextResponse.json({
      retention: retentionRes.data ?? [],
      first:     firstRes.data     ?? [],
      ltv:       ltvRes.data       ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
