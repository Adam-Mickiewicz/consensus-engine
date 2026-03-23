export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { getServiceClient } from '@/lib/supabase/server';
import BehaviorView from './BehaviorView';
import GlobalCRMFilters from '@/components/crm/GlobalCRMFilters';

export default async function BehaviorPage() {
  const sb = getServiceClient();

  const [segRes, cobuyRes] = await Promise.all([
    sb.from('crm_behavior_segments').select('*').single(),
    sb.from('crm_behavior_cobuying')
      .select('product_a, product_b, co_purchases')
      .order('co_purchases', { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <GlobalCRMFilters />
      </Suspense>
      <BehaviorView
        segments={segRes.data ?? null}
        cobuying={cobuyRes.data ?? []}
      />
    </>
  );
}
