import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_PRIORITIES = ['KRYTYCZNY', 'WYSOKI', 'ŚREDNI', 'NISKI', 'OK'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view     = searchParams.get('view');
    const priority = searchParams.get('priority');
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit    = 50;
    const offset   = (page - 1) * limit;
    const sb       = getServiceClient();

    if (view === 'collectors') {
      const { data, error, count } = await sb
        .from('crm_segment_collectors')
        .select('*', { count: 'exact' })
        .order('unique_products', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    if (view === 'single') {
      const { data, error, count } = await sb
        .from('crm_segment_single_product')
        .select('*', { count: 'exact' })
        .order('purchase_count', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    if (view === 'worlds') {
      const { data, error, count } = await sb
        .from('crm_segment_world_evolution')
        .select('*', { count: 'exact' })
        .order('world_count', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    if (view === 'churn') {
      const safePriority = VALID_PRIORITIES.includes(priority ?? '') ? priority : null;
      let q = sb
        .from('crm_segment_churn_risk')
        .select('*', { count: 'exact' })
        .order('churn_score', { ascending: false })
        .range(offset, offset + limit - 1);
      if (safePriority) q = q.eq('churn_priority', safePriority);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit });
    }

    // Default: summary
    const { data, error } = await sb
      .from('crm_segment_summary')
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? {});
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
