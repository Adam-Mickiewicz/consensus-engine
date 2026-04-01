import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Brak ID klienta' }, { status: 400 });

    const sb = getServiceClient();

    const [profileRes, eventsRes, taxonomyRes, predictionRes] = await Promise.all([
      sb.from('clients_360').select('*').eq('client_id', id).single(),

      sb.from('client_product_events')
        .select('id,client_id,ean,product_name,order_date,season,order_id,order_sum,line_total,is_promo,is_new_product,price_category_id')
        .eq('client_id', id)
        .order('order_date', { ascending: false })
        .limit(500),

      sb.from('client_taxonomy_summary').select('*').eq('client_id', id).maybeSingle(),

      sb.from('crm_predictive_ltv')
        .select('predicted_next_order,days_to_next_order,purchase_probability_30d,predicted_ltv_12m,avg_order_value,avg_days_between_orders,orders_count')
        .eq('client_id', id)
        .maybeSingle(),
    ]);

    if (eventsRes.error) console.error('events error:', eventsRes.error);
    if (taxonomyRes.error) console.error('taxonomy error:', taxonomyRes.error);
    if (predictionRes.error) console.error('prediction error:', predictionRes.error);

    if (profileRes.error) {
      if (profileRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Nie znaleziono klienta' }, { status: 404 });
      }
      throw new Error(profileRes.error.message);
    }

    const client  = profileRes.data;
    const events  = eventsRes.data ?? [];

    // === Barometer (0–100) ===
    const daysSinceLast = client.last_order
      ? Math.floor((Date.now() - new Date(client.last_order).getTime()) / 86400000)
      : 999;
    const avgInterval = client.orders_count > 1 && client.first_order
      ? Math.floor((new Date(client.last_order).getTime() - new Date(client.first_order).getTime()) / 86400000 / (client.orders_count - 1))
      : 365;
    const recencyScore  = Math.max(0, Math.min(100, Math.round(100 - (daysSinceLast / Math.max(avgInterval * 2, 1)) * 100)));
    const frequencyScore = Math.min(100, Math.round((client.orders_count / 10) * 100));
    const monetaryScore  = Math.min(100, Math.round(((client.ltv || 0) / 5000) * 100));
    const barometerScore = Math.round(recencyScore * 0.4 + frequencyScore * 0.3 + monetaryScore * 0.2 + 50 * 0.1);
    const barometerLabel = barometerScore > 75 ? 'Doskonały' : barometerScore > 50 ? 'Dobry' : barometerScore > 25 ? 'Zagrożony' : 'Krytyczny';
    const barometerColor = barometerScore > 75 ? '#2d8a4e' : barometerScore > 50 ? '#e6a817' : barometerScore > 25 ? '#dd4444' : '#999';

    // === Gift indicator ===
    const GIFT_SEASONS = ['MIKOLAJ', 'WALENTYN', 'DZIEN_MAT', 'DZIEN_OJC', 'DZIEN_KOB', 'DZIEN_CHL', 'GWIAZDKA', 'SWIAT', 'WIELKANOC', 'HALLOWEEN'];
    const giftEvents = events.filter(e =>
      GIFT_SEASONS.some(kw => (e.season || '').toUpperCase().includes(kw))
    );
    const giftScore = events.length > 0 ? Math.round((giftEvents.length / events.length) * 100) : 0;
    const giftLabel = giftScore > 60 ? 'Głównie prezenty' : giftScore > 30 ? 'Mix: siebie + prezenty' : 'Głównie dla siebie';

    // === Season revenue breakdown ===
    const seasonMap = {};
    events.forEach(e => {
      const s = e.season || 'Inne';
      if (!seasonMap[s]) seasonMap[s] = { count: 0, revenue: 0 };
      seasonMap[s].count++;
      seasonMap[s].revenue += parseFloat(e.line_total) || 0;
    });
    const seasonBreakdown = Object.entries(seasonMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, d]) => ({ name, count: d.count, revenue: Math.round(d.revenue) }));

    // === New product ratio ===
    const newProductCount = events.filter(e => e.is_new_product === true).length;
    const newProductRatio = events.length > 0 ? Math.round((newProductCount / events.length) * 100) : 0;

    return NextResponse.json({
      profile:    client,
      events,
      taxonomy:   taxonomyRes.data  ?? null,
      prediction: predictionRes.data ?? null,
      barometer:  { score: barometerScore, label: barometerLabel, color: barometerColor, recency: recencyScore, frequency: frequencyScore, monetary: monetaryScore },
      giftScore,
      giftLabel,
      seasonBreakdown,
      newProductRatio,
      newProductCount,
    }, { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
