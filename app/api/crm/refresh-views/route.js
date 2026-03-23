import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    const sb = getServiceClient();
    const { error } = await sb.rpc('refresh_crm_views');
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}
