import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [distRes, heatmapRes] = await Promise.all([
      supabase.from('crm_rfm_distribution').select('*'),
      supabase.from('clients_360')
        .select('rfm_recency_score,rfm_frequency_score,purchase_probability_30d,predicted_ltv_12m')
        .not('rfm_recency_score', 'is', null)
        .limit(200000),
    ]);

    // Aggregate heatmap client-side
    const heatmap = {};
    let totalPredictedLtv = 0;
    let highProbCount = 0;
    let ltvCount = 0;
    let ltvSum = 0;

    heatmapRes.data?.forEach(c => {
      const key = `${c.rfm_recency_score}_${c.rfm_frequency_score}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
      if (c.predicted_ltv_12m) { totalPredictedLtv += parseFloat(c.predicted_ltv_12m); ltvCount++; ltvSum += parseFloat(c.predicted_ltv_12m); }
      if (c.purchase_probability_30d && parseFloat(c.purchase_probability_30d) > 50) highProbCount++;
    });

    // Probability histogram buckets
    const probBuckets = { '0-10': 0, '10-30': 0, '30-50': 0, '50-70': 0, '70-100': 0 };
    heatmapRes.data?.forEach(c => {
      const p = parseFloat(c.purchase_probability_30d || '0');
      if (p <= 10) probBuckets['0-10']++;
      else if (p <= 30) probBuckets['10-30']++;
      else if (p <= 50) probBuckets['30-50']++;
      else if (p <= 70) probBuckets['50-70']++;
      else probBuckets['70-100']++;
    });

    return Response.json({
      distribution: distRes.data || [],
      heatmap,
      predictive: {
        total_predicted_ltv: Math.round(totalPredictedLtv),
        avg_predicted_ltv: ltvCount > 0 ? Math.round(ltvSum / ltvCount) : 0,
        high_prob_count: highProbCount,
        prob_buckets: probBuckets,
      },
      errors: [distRes.error, heatmapRes.error].filter(Boolean).map(e => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
