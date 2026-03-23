export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServiceClient } from '@/lib/supabase/server';
import BehaviorView from './BehaviorView';

type SP = Record<string, string | string[] | undefined>;
function str(v: SP[string]) { return typeof v === 'string' ? v : undefined; }

export default async function BehaviorPage({ searchParams }: { searchParams: SP }) {
  const sb = getServiceClient();
  const dateFrom = str(searchParams.date_from) ?? '';
  const dateTo   = str(searchParams.date_to)   ?? '';

  const [segRes, cobuyRes] = await Promise.all([
    sb.from('crm_behavior_segments').select('*').single(),
    sb.from('crm_behavior_cobuying')
      .select('product_a, product_b, co_purchases')
      .order('co_purchases', { ascending: false })
      .limit(20),
  ]);

  return (
    <BehaviorView
      segments={segRes.data ?? null}
      cobuying={cobuyRes.data ?? []}
      dateFrom={dateFrom}
      dateTo={dateTo}
    />
  );
}
