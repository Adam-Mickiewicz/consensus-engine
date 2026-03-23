export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { getServiceClient } from '@/lib/supabase/server';
import OccasionsView from './OccasionsView';
import GlobalCRMFilters from '@/components/crm/GlobalCRMFilters';

const YEARS = [2022, 2023, 2024, 2025];

type SP = Record<string, string | string[] | undefined>;
function str(v: SP[string]) { return typeof v === 'string' ? v : undefined; }

export default async function OccasionsPage({ searchParams }: { searchParams: SP }) {
  const sb = getServiceClient();
  const occasion = str(searchParams.occasion);

  let retQ = sb.from('crm_occasion_retention').select('*');
  let firstQ = sb.from('crm_occasion_first').select('*').order('new_clients', { ascending: false });
  let ltvQ = sb.from('crm_occasion_ltv').select('*').order('avg_client_ltv', { ascending: false });
  let loyalCountQ = sb.from('crm_occasion_loyal').select('*', { count: 'exact', head: true });
  let loyalQ = sb.from('crm_occasion_loyal').select('*').order('years_active', { ascending: false }).order('total_ltv', { ascending: false }).limit(50);
  let driftQ = sb.from('crm_occasion_drift').select('*').order('occasion_count', { ascending: false }).limit(50);

  // Filter by occasion if selected
  if (occasion) {
    retQ = retQ.eq('occasion', occasion);
    firstQ = firstQ.eq('occasion', occasion);
    ltvQ = ltvQ.eq('occasion', occasion);
  }

  const [retentionRes, firstRes, ltvRes, loyalCountRes, loyalRes, driftRes] =
    await Promise.all([retQ, firstQ, ltvQ, loyalCountQ, loyalQ, driftQ]);

  const retention  = retentionRes.data  ?? [];
  const first      = firstRes.data      ?? [];
  const ltv        = ltvRes.data        ?? [];
  const loyal      = loyalRes.data      ?? [];
  const drift      = driftRes.data      ?? [];
  const loyalCount = loyalCountRes.count ?? 0;

  if (!retention.length && !ltv.length) {
    return (
      <>
        <Suspense fallback={null}><GlobalCRMFilters /></Suspense>
        <OccasionsView data={null} />
      </>
    );
  }

  const bestLtvOccasion = ltv[0]?.occasion ?? '—';
  const bestLtvValue    = ltv[0]?.avg_client_ltv ?? 0;

  const bestRetentionRow = retention.reduce<{ occasion: string; retention_pct: number; year: number } | null>(
    (best, r) => !best || Number(r.retention_pct) > Number(best.retention_pct) ? r : best,
    null
  );

  const bestNewOccasion = first[0]?.occasion ?? '—';
  const bestNewCount    = first[0]?.new_clients ?? 0;

  const retentionMap: Record<string, Record<number, number | null>> = {};
  const retentionOccasions = [...new Set(retention.map(r => r.occasion as string))];
  for (const occ of retentionOccasions) {
    retentionMap[occ] = {};
    for (const y of YEARS) retentionMap[occ][y] = null;
  }
  for (const row of retention) {
    if (retentionMap[row.occasion]) {
      retentionMap[row.occasion][row.year as number] = Number(row.retention_pct);
    }
  }

  return (
    <>
      <Suspense fallback={null}><GlobalCRMFilters /></Suspense>
      <OccasionsView
        data={{
          loyalCount,
          bestLtvOccasion,
          bestLtvValue:    Number(bestLtvValue),
          bestRetention:   bestRetentionRow
            ? { occasion: bestRetentionRow.occasion, pct: Number(bestRetentionRow.retention_pct), year: bestRetentionRow.year }
            : null,
          bestNewOccasion,
          bestNewCount:    Number(bestNewCount),
          retentionOccasions,
          retentionMap,
          retentionYears:  YEARS,
          first:  first.map(r => ({ ...r, new_clients: Number(r.new_clients), avg_first_basket: Number(r.avg_first_basket), pct_of_new: Number(r.pct_of_new) })),
          ltv:    ltv.map(r => ({ ...r, clients: Number(r.clients), orders: Number(r.orders), avg_basket: Number(r.avg_basket), avg_client_ltv: Number(r.avg_client_ltv) })),
          loyal:  loyal.map(r => ({ ...r, years_active: Number(r.years_active), total_ltv: Number(r.total_ltv) })),
          drift:  drift.map(r => ({ ...r, occasion_count: Number(r.occasion_count) })),
        }}
      />
    </>
  );
}
