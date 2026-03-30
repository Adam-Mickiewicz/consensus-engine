import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('job_type');

    const sb = getServiceClient();
    let query = sb
      .from('bms_presets')
      .select('*')
      .eq('is_shared', true)
      .order('created_at', { ascending: true });

    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[brand-media/presets] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, job_type, model_id, params, prompt_template, is_shared = true, created_by } = body;

    if (!name || !job_type) {
      return NextResponse.json({ error: 'name i job_type są wymagane' }, { status: 400 });
    }

    const sb = getServiceClient();
    const { data, error } = await sb
      .from('bms_presets')
      .insert([{ name, description, job_type, model_id, params: params || {}, prompt_template, is_shared, created_by }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[brand-media/presets] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
