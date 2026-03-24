import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    const sb = getServiceClient();
    const { error } = await sb.rpc('refresh_crm_views');
    if (error) {
      console.error('[refresh-views] RPC error (full):', JSON.stringify(error, null, 2));
      throw new Error(`${error.message} (code: ${error.code}, hint: ${error.hint ?? '-'})`);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Błąd serwera';
    console.error('[refresh-views] caught:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
