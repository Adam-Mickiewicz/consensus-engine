import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const {
      model_id,
      prompt,
      music_mode,
      music_brief,
      params,
      reference_urls,
      estimated_cost,
      extend_from_job_id,
    } = body;

    if (!model_id || (!prompt?.trim() && !extend_from_job_id)) {
      return Response.json({ error: 'model_id i prompt są wymagane' }, { status: 400 });
    }

    const validModels = ['veo31', 'veo31fast', 'veo3', 'veo3fast', 'sora2', 'sora2pro'];
    if (!validModels.includes(model_id)) {
      return Response.json({ error: `Nieznany model: ${model_id}` }, { status: 400 });
    }

    // Jeśli extend — pobierz prompt z parenta jeśli nie podano
    let finalPrompt = prompt?.trim() || '';
    if (extend_from_job_id && !finalPrompt) {
      const { data: parentJob } = await supabase
        .from('bms_jobs')
        .select('prompt')
        .eq('id', extend_from_job_id)
        .single();
      finalPrompt = parentJob?.prompt || '';
    }

    const output_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const jobParams = extend_from_job_id
      ? { ...(params || {}), extend_from_job_id }
      : (params || {});

    const { data: job, error } = await supabase
      .from('bms_jobs')
      .insert({
        job_type: 'video',
        model_id,
        status: 'queued',
        prompt: finalPrompt,
        music_mode: music_mode || 'none',
        music_brief: music_brief || null,
        params: jobParams,
        reference_urls: reference_urls || [],
        output_urls: [],
        estimated_cost: estimated_cost || null,
        output_expires_at,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ job_id: job.id, status: 'queued' });
  } catch (error) {
    console.error('[generate-video] POST error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
