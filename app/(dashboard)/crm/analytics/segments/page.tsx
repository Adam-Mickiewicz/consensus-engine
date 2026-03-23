export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { getServiceClient } from '@/lib/supabase/server';
import SegmentsView from './SegmentsView';
import GlobalCRMFilters from '@/components/crm/GlobalCRMFilters';

type SP = Record<string, string | string[] | undefined>;
function str(v: SP[string]) { return typeof v === 'string' ? v : undefined; }

export default async function SegmentsPage({ searchParams }: { searchParams: SP }) {
  const sb = getServiceClient();

  const segment    = str(searchParams.segment);
  const risk       = str(searchParams.risk);
  const world      = str(searchParams.world);

  let churnQ = sb.from('crm_segment_churn_risk')
    .select('client_id,legacy_segment,risk_level,ltv,days_inactive,orders_count,avg_order_value,churn_priority,churn_score')
    .order('churn_score', { ascending: false })
    .limit(500);
  if (segment) churnQ = churnQ.eq('legacy_segment', segment);
  if (risk)    churnQ = churnQ.eq('risk_level', risk);

  let collectorsQ = sb.from('crm_segment_collectors')
    .select('*').order('unique_products', { ascending: false }).limit(20);
  if (world) collectorsQ = collectorsQ.eq('ulubiony_swiat', world);

  const [
    summaryRes,
    collectorsRes,
    singleRes,
    worldsRes,
    churnRes,
  ] = await Promise.all([
    sb.from('crm_segment_summary').select('*').single(),
    collectorsQ,
    sb.from('crm_segment_single_product').select('*').order('purchase_count', { ascending: false }).limit(20),
    sb.from('crm_segment_world_evolution').select('*').order('world_count', { ascending: false }).limit(20),
    churnQ,
  ]);

  const summary    = summaryRes.data    ?? null;
  const collectors = collectorsRes.data ?? [];
  const single     = singleRes.data     ?? [];
  const worlds     = worldsRes.data     ?? [];
  const churn      = (churnRes.data ?? []).map(r => ({
    ...r,
    ltv:             Number(r.ltv),
    days_inactive:   Number(r.days_inactive),
    orders_count:    Number(r.orders_count),
    avg_order_value: Number(r.avg_order_value),
    churn_score:     Number(r.churn_score),
  }));

  return (
    <>
      <Suspense fallback={null}><GlobalCRMFilters /></Suspense>
      <SegmentsView
        summary={summary ? {
          collectors_count:     Number(summary.collectors_count),
          single_product_count: Number(summary.single_product_count),
          multi_world_count:    Number(summary.multi_world_count),
          critical_churn:       Number(summary.critical_churn),
          high_churn:           Number(summary.high_churn),
          avg_churn_score:      Number(summary.avg_churn_score),
        } : null}
        collectors={collectors.map(r => ({
          ...r,
          unique_products:    Number(r.unique_products),
          total_orders:       Number(r.total_orders),
          products_per_order: Number(r.products_per_order),
        }))}
        single={single.map(r => ({
          ...r,
          purchase_count: Number(r.purchase_count),
          total_spent:    Number(r.total_spent),
        }))}
        worlds={worlds.map(r => ({
          ...r,
          world_count: Number(r.world_count),
        }))}
        churn={churn}
      />
    </>
  );
}
