import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('crm_launch_monitor')
      .select('*')
      .order('launch_date', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const products = data || [];
    const summary = {
      total_launches: products.length,
      total_revenue: products.reduce((sum, p) => sum + parseFloat(p.total_revenue || 0), 0),
      total_buyers: products.reduce((sum, p) => sum + (p.unique_buyers || 0), 0),
      avg_repeat_pct: products.length > 0
        ? products.reduce((sum, p) => sum + parseFloat(p.repeat_buyer_pct || 0), 0) / products.length
        : 0,
      new_customer_attracted: products.reduce((sum, p) => sum + (p.new_customer_buyers || 0), 0),
    };

    return Response.json({ products, summary }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
