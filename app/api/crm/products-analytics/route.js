import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sb = getServiceClient();
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'total_revenue';
    const order = searchParams.get('order') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

    const [productsRes, seasonsRes, crossSellRes, worldsRes] = await Promise.all([
      sb.from('crm_product_performance').select('*').order(sort, { ascending: order === 'asc' }).limit(limit),
      sb.from('crm_season_performance').select('*'),
      sb.from('crm_cross_sell').select('*').limit(100),
      sb.from('crm_worlds_performance').select('*'),
    ]);

    const errors = [productsRes.error, seasonsRes.error, crossSellRes.error, worldsRes.error]
      .filter(Boolean).map(e => e.message);
    if (errors.length) console.error('[crm/products-analytics]', errors);

    return Response.json({
      products: productsRes.data || [],
      seasons: seasonsRes.data || [],
      crossSell: crossSellRes.data || [],
      worlds: worldsRes.data || [],
      errors,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
