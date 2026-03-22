import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Brak ID klienta' }, { status: 400 });

    const sb = getServiceClient();

    const [profileRes, eventsRes, taxonomyRes] = await Promise.all([
      sb.from('clients_360').select('*').eq('client_id', id).single(),
      sb.from('client_product_events')
        .select('id,client_id,ean,product_name,order_date,season,occasion')
        .eq('client_id', id)
        .order('order_date', { ascending: false }),
      sb.from('client_taxonomy_summary').select('*').eq('client_id', id).maybeSingle(),
    ]);

    if (profileRes.error) {
      if (profileRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Nie znaleziono klienta' }, { status: 404 });
      }
      throw new Error(profileRes.error.message);
    }

    return NextResponse.json({
      profile:  profileRes.data,
      events:   eventsRes.data ?? [],
      taxonomy: taxonomyRes.data ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
