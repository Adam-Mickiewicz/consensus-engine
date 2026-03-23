import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from('crm_behavior_cobuying')
      .select('*')
      .order('co_purchases', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
