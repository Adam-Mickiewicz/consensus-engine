import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      model_id,
      prompt,
      music_mode = 'none',
      music_brief,
      params = {},
      reference_urls = [],
      estimated_cost,
    } = body;

    if (!model_id) {
      return NextResponse.json({ error: 'model_id is required' }, { status: 400 });
    }
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const sb = getServiceClient();

    // Verify model exists
    const { data: model, error: modelError } = await sb
      .from('bms_model_config')
      .select('model_id, is_active')
      .eq('model_id', model_id)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    if (!model.is_active) {
      return NextResponse.json({ error: 'Model is not active' }, { status: 400 });
    }

    const output_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: job, error: insertError } = await sb
      .from('bms_jobs')
      .insert([{
        job_type: 'video',
        model_id,
        status: 'queued',
        prompt: prompt.trim(),
        music_mode,
        music_brief: music_brief || null,
        params,
        reference_urls,
        output_urls: [],
        output_expires_at,
        estimated_cost: estimated_cost || null,
      }])
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ job_id: job.id, status: 'queued' });
  } catch (err) {
    console.error('[brand-media/generate-video] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
