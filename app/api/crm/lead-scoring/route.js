import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const temperature = searchParams.get('temperature');
    const format = searchParams.get('format');

    if (format === 'csv' && temperature) {
      const { data } = await supabase
        .from('clients_360')
        .select('client_id,legacy_segment,rfm_segment,ltv,orders_count,lead_score,lead_temperature,purchase_probability_30d,predicted_ltv_12m,top_domena,days_since_last_order')
        .eq('lead_temperature', temperature)
        .order('lead_score', { ascending: false });
      const rows = data || [];
      const header = 'client_id,segment,rfm,ltv,orders,lead_score,temperature,prob_30d,pred_ltv_12m,world,days_inactive\n';
      const csv = header + rows.map(c =>
        [c.client_id, c.legacy_segment, c.rfm_segment, c.ltv, c.orders_count, c.lead_score, c.lead_temperature, c.purchase_probability_30d, c.predicted_ltv_12m, c.top_domena, c.days_since_last_order].join(',')
      ).join('\n');
      return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="hot-leads.csv"` } });
    }

    const [distRes, hotRes, giftRes] = await Promise.all([
      supabase.from('crm_lead_distribution').select('*'),
      supabase.from('clients_360')
        .select('client_id,legacy_segment,rfm_segment,ltv,orders_count,lead_score,lead_temperature,purchase_probability_30d,predicted_ltv_12m,top_domena,days_since_last_order')
        .eq('lead_temperature', 'Hot')
        .order('lead_score', { ascending: false })
        .limit(50),
      supabase.from('crm_gift_distribution').select('*'),
    ]);

    return Response.json({
      distribution: distRes.data || [],
      topHot: hotRes.data || [],
      giftDistribution: giftRes.data || [],
      errors: [distRes.error, hotRes.error, giftRes.error].filter(Boolean).map(e => e.message),
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
