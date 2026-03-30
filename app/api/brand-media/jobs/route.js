import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';

    const sb = getServiceClient();

    let query = sb
      .from('bms_jobs')
      .select(`
        id, job_type, model_id, status, prompt, music_mode,
        params, reference_urls, output_urls, output_expires_at,
        estimated_cost, actual_cost, error_message, created_at, updated_at,
        bms_model_config ( model_name, provider, category, badge, badge_color )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ jobs: data || [] });
  } catch (err) {
    console.error('[brand-media/jobs] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
