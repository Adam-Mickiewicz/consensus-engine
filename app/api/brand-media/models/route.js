import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const sb = getServiceClient();

    let query = sb
      .from('bms_model_config')
      .select('*')
      .eq('is_active', true)
      .order('price_per_unit', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ models: data || [] });
  } catch (err) {
    console.error('[brand-media/models] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
