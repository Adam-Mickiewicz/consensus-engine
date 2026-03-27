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
        .select('id,client_id,ean,product_name,order_date,season,order_id,order_sum,is_promo,is_new_product,price_category_id')
        .eq('client_id', id)
        .order('order_date', { ascending: false }),

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

    return NextResponse.json({
      profile:    profileRes.data,
      events:     eventsRes.data   ?? [],
      taxonomy:   taxonomyRes.data ?? null,
      prediction: predictionRes.data ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
