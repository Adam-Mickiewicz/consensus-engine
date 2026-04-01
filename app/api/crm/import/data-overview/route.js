import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const granularity = searchParams.get('granularity') || 'yearly';

    const sb = getServiceClient();

    const [clientCount, eventCount, productCount, promoCount, minDate, maxDate, granulation, eanCount, promoFlagCount] = await Promise.all([
      sb.from('clients_360').select('*', { count: 'exact', head: true }),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }),
      sb.from('products').select('*', { count: 'exact', head: true }),
      sb.from('promotions').select('*', { count: 'exact', head: true }),
      sb.from('client_product_events').select('order_date').order('order_date', { ascending: true }).limit(1),
      sb.from('client_product_events').select('order_date').order('order_date', { ascending: false }).limit(1),
      sb.rpc('get_data_granulation', { p_granularity: granularity }),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }).not('ean', 'is', null),
      sb.from('client_product_events').select('*', { count: 'exact', head: true }).eq('is_promo', true),
    ]);

    const totalEvents = eventCount.count || 1;

    return Response.json({
      summary: {
        clients: clientCount.count || 0,
        events: eventCount.count || 0,
        products: productCount.count || 0,
        promotions: promoCount.count || 0,
        dateFrom: minDate.data?.[0]?.order_date,
        dateTo: maxDate.data?.[0]?.order_date,
      },
      granulation: granulation.data || [],
      quality: {
        ean_pct: Math.round((eanCount.count || 0) / totalEvents * 1000) / 10,
        promo_pct: Math.round((promoFlagCount.count || 0) / totalEvents * 1000) / 10,
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Błąd serwera' }, { status: 500 });
  }
}
