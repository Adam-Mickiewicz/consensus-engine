import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const limit = Math.min(2000, parseInt(searchParams.get('limit') || '500'));

  try {
    const { data, error } = await supabase.rpc('get_ean_gaps', { p_limit: limit });

    let gaps;
    if (error || !data) {
      // Fallback: aggregate client-side
      const { data: raw } = await supabase
        .from('client_product_events')
        .select('product_name,client_id')
        .is('ean', null)
        .limit(20000);

      const counts = {};
      const buyers = {};
      raw?.forEach(r => {
        if (!r.product_name) return;
        counts[r.product_name] = (counts[r.product_name] || 0) + 1;
        if (!buyers[r.product_name]) buyers[r.product_name] = new Set();
        buyers[r.product_name].add(r.client_id);
      });

      gaps = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({
          product_name: name,
          event_count: count,
          unique_buyers: buyers[name]?.size || 0,
          ean_do_uzupelnienia: '',
        }));
    } else {
      gaps = data;
    }

    if (format === 'csv') {
      const BOM = '\uFEFF';
      const csv = BOM + 'product_name;event_count;unique_buyers;ean_do_uzupelnienia\n' +
        (gaps || []).map(r =>
          `"${(r.product_name || '').replace(/"/g, '""')}";${r.event_count};${r.unique_buyers};`
        ).join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=ean-gaps.csv',
        },
      });
    }

    return Response.json({ gaps: gaps || [], total: (gaps || []).length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
