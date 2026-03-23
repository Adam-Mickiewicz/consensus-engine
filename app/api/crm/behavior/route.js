import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const sb = getServiceClient();

    if (clientId) {
      const [promoRes, basketRes, timingRes, loyaltyRes] = await Promise.all([
        sb.from('crm_behavior_promo').select('*').eq('client_id', clientId).single(),
        sb.from('crm_behavior_basket').select('*').eq('client_id', clientId).single(),
        sb.from('crm_behavior_timing').select('*').eq('client_id', clientId).single(),
        sb.from('crm_behavior_loyalty').select('*').eq('client_id', clientId).single(),
      ]);
      return NextResponse.json({
        promo:   promoRes.data   ?? null,
        basket:  basketRes.data  ?? null,
        timing:  timingRes.data  ?? null,
        loyalty: loyaltyRes.data ?? null,
      });
    }

    const { data, error } = await sb
      .from('crm_behavior_segments')
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? {});
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
